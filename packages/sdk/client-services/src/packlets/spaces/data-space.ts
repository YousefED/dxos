//
// Copyright 2022 DXOS.org
//

import { Event, scheduleTask, trackLeaks } from '@dxos/async';
import { SpaceState } from '@dxos/client';
import { Context } from '@dxos/context';
import { CredentialConsumer } from '@dxos/credentials';
import { timed } from '@dxos/debug';
import {
  MetadataStore,
  Space,
  SigningContext,
  createMappedFeedWriter,
  SnapshotManager,
  DataPipeline,
} from '@dxos/echo-pipeline';
import { CancelledError, SystemError } from '@dxos/errors';
import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { SpaceCache } from '@dxos/protocols/proto/dxos/echo/metadata';
import { AdmittedFeed, Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { Gossip, Presence } from '@dxos/teleport-extension-gossip';
import { ComplexSet } from '@dxos/util';

import { TrustedKeySetAuthVerifier } from '../identity';
import { NotarizationPlugin } from './notarization-plugin';

const AUTH_TIMEOUT = 30000;

export type DataSpaceCallbacks = {
  /**
   * Called before transitioning to the ready state.
   */
  beforeReady?: () => Promise<void>;

  /**
   * Called after transitioning to the ready state.
   */
  afterReady?: () => Promise<void>;
};

export type DataSpaceParams = {
  inner: Space;
  modelFactory: ModelFactory;
  metadataStore: MetadataStore;
  snapshotManager: SnapshotManager;
  gossip: Gossip;
  presence: Presence;
  keyring: Keyring;
  feedStore: FeedStore<FeedMessage>;
  signingContext: SigningContext;
  memberKey: PublicKey;
  snapshotId?: string | undefined;
  callbacks?: DataSpaceCallbacks;
  cache?: SpaceCache;
};

@trackLeaks('open', 'close')
export class DataSpace {
  private readonly _ctx = new Context();
  private readonly _dataPipeline: DataPipeline;
  private readonly _inner: Space;
  private readonly _gossip: Gossip;
  private readonly _presence: Presence;
  private readonly _keyring: Keyring;
  private readonly _feedStore: FeedStore<FeedMessage>;
  private readonly _metadataStore: MetadataStore;
  private readonly _signingContext: SigningContext;
  private readonly _notarizationPluginConsumer: CredentialConsumer<NotarizationPlugin>;
  private readonly _callbacks: DataSpaceCallbacks;
  private readonly _cache?: SpaceCache;

  private _state = SpaceState.CLOSED;

  public readonly authVerifier: TrustedKeySetAuthVerifier;
  public readonly stateUpdate = new Event();

  constructor(params: DataSpaceParams) {
    this._inner = params.inner;
    this._inner.stateUpdate.on(this._ctx, () => this.stateUpdate.emit());

    this._gossip = params.gossip;
    this._presence = params.presence;
    this._keyring = params.keyring;
    this._feedStore = params.feedStore;
    this._metadataStore = params.metadataStore;
    this._signingContext = params.signingContext;
    this._callbacks = params.callbacks ?? {};
    this._dataPipeline = new DataPipeline({
      modelFactory: params.modelFactory,
      metadataStore: params.metadataStore,
      snapshotManager: params.snapshotManager,
      memberKey: params.memberKey,
      spaceKey: this._inner.key,
      feedInfoProvider: (feedKey) => this._inner.spaceState.feeds.get(feedKey),
      snapshotId: params.snapshotId,
    });

    this.authVerifier = new TrustedKeySetAuthVerifier({
      trustedKeysProvider: () => new ComplexSet(PublicKey.hash, Array.from(this._inner.spaceState.members.keys())),
      update: this._inner.stateUpdate,
      authTimeout: AUTH_TIMEOUT,
    });

    this._notarizationPluginConsumer = this._inner.spaceState.registerProcessor(new NotarizationPlugin());
    this._cache = params.cache;
  }

  get key() {
    return this._inner.key;
  }

  get isOpen() {
    return this._inner.isOpen;
  }

  get state(): SpaceState {
    return this._state;
  }

  // TODO(burdon): Can we mark this for debugging only?
  get inner() {
    return this._inner;
  }

  get dataPipeline(): DataPipeline {
    return this._dataPipeline;
  }

  get presence() {
    return this._presence;
  }

  get notarizationPlugin() {
    return this._notarizationPluginConsumer.processor;
  }

  get cache() {
    return this._cache;
  }

  async open() {
    await this.notarizationPlugin.open();
    await this._notarizationPluginConsumer.open();
    await this._inner.open();
    this._state = SpaceState.INACTIVE;
  }

  async close() {
    this._state = SpaceState.CLOSED;
    await this._ctx.dispose();

    await this._dataPipeline.close();
    await this.authVerifier.close();

    await this._inner.close();
    await this._notarizationPluginConsumer.close();
    await this.notarizationPlugin.close();

    await this._presence.destroy();
  }

  async postMessage(channel: string, message: any) {
    return this._gossip.postMessage(channel, message);
  }

  listen(channel: string, callback: (message: GossipMessage) => void) {
    return this._gossip.listen(channel, callback);
  }

  /**
   * Initialize the data pipeline in a separate task.
   */
  initializeDataPipelineAsync() {
    scheduleTask(this._ctx, async () => {
      try {
        await this.initializeDataPipeline();
      } catch (err) {
        if (err instanceof CancelledError) {
          log('Data pipeline initialization cancelled', err);
          return;
        }

        log.error('Error initializing data pipeline', err);
      }
    });
  }

  async initializeDataPipeline() {
    if (this._state !== SpaceState.INACTIVE) {
      throw new SystemError('Invalid operation');
    }
    this._state = SpaceState.INITIALIZING;

    // TODO(dmaretskyi): Cancel with context.
    await this._inner.controlPipeline.state.waitUntilReachedTargetTimeframe({
      ctx: this._ctx,
      breakOnStall: false,
    });

    await this._createWritableFeeds();
    log('Writable feeds created');
    this.stateUpdate.emit();

    this.notarizationPlugin.setWriter(
      createMappedFeedWriter<Credential, FeedMessage.Payload>(
        (credential) => ({
          credential: { credential },
        }),
        this._inner.controlPipeline.writer,
      ),
    );

    await this._dataPipeline.open({
      openPipeline: async (start) => {
        const pipeline = await this._inner.createDataPipeline({ start });
        await pipeline.start();
        return pipeline;
      },
    });

    log('waiting for data pipeline to reach target timeframe');
    // Wait for the data pipeline to catch up to its desired timeframe.
    await this._dataPipeline.pipelineState!.waitUntilReachedTargetTimeframe({
      ctx: this._ctx,
      breakOnStall: false,
    });

    log('data pipeline ready');
    await this._callbacks.beforeReady?.();

    this._state = SpaceState.READY;
    this.stateUpdate.emit();

    await this._callbacks.afterReady?.();
  }

  @timed(10_000)
  private async _createWritableFeeds() {
    const credentials: Credential[] = [];
    if (!this.inner.controlFeedKey) {
      const controlFeed = await this._feedStore.openFeed(await this._keyring.createKey(), { writable: true });
      this.inner.setControlFeed(controlFeed);

      credentials.push(
        await this._signingContext.credentialSigner.createCredential({
          subject: controlFeed.key,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            spaceKey: this.key,
            deviceKey: this._signingContext.deviceKey,
            identityKey: this._signingContext.identityKey,
            designation: AdmittedFeed.Designation.CONTROL,
          },
        }),
      );
    }
    if (!this.inner.dataFeedKey) {
      const dataFeed = await this._feedStore.openFeed(await this._keyring.createKey(), { writable: true });
      this.inner.setDataFeed(dataFeed);

      credentials.push(
        await this._signingContext.credentialSigner.createCredential({
          subject: dataFeed.key,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            spaceKey: this.key,
            deviceKey: this._signingContext.deviceKey,
            identityKey: this._signingContext.identityKey,
            designation: AdmittedFeed.Designation.DATA,
          },
        }),
      );
    }

    if (credentials.length > 0) {
      // Never times out
      await this.notarizationPlugin.notarize({ ctx: this._ctx, credentials, timeout: 0 });
    }

    // Set this after credentials are notarized so that on failure we will retry.
    await this._metadataStore.setWritableFeedKeys(this.key, this.inner.controlFeedKey!, this.inner.dataFeedKey!);
  }
}
