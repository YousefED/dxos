//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import {
  DeviceStateMachine,
  CredentialSigner,
  createCredentialSignerWithKey,
  createCredentialSignerWithChain,
  ProfileStateMachine
} from '@dxos/credentials';
import { Signer } from '@dxos/crypto';
import { Space } from '@dxos/echo-db';
import { writeMessages } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TypedMessage } from '@dxos/protocols';
import { AdmittedFeed, ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { HaloAdmissionCredentials } from '@dxos/protocols/proto/dxos/halo/invitations';
import { ComplexSet } from '@dxos/util';

export type IdentityParams = {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  signer: Signer;
  space: Space;
};

/**
 * Agent identity manager, which includes the agent's Halo space.
 */
export class Identity {
  private readonly _space: Space;
  private readonly _signer: Signer;
  private readonly _deviceStateMachine: DeviceStateMachine;
  private readonly _profileStateMachine: ProfileStateMachine;

  public readonly identityKey: PublicKey;
  public readonly deviceKey: PublicKey;

  public readonly stateUpdate = new Event();

  constructor({ space, signer, identityKey, deviceKey }: IdentityParams) {
    this._space = space;
    this._signer = signer;

    this.identityKey = identityKey;
    this.deviceKey = deviceKey;

    this._deviceStateMachine = new DeviceStateMachine(this.identityKey, this.deviceKey);
    this._profileStateMachine = new ProfileStateMachine(this.identityKey);

    // Process halo-specific credentials.
    this._space.onCredentialProcessed.set(async (credential) => {
      // Save device keychain credential when processed by the space state machine.
      await this._deviceStateMachine.process(credential);
      await this._profileStateMachine.process(credential);
      this.stateUpdate.emit();
    });
  }

  // TODO(burdon): Expose state object?
  get authorizedDeviceKeys(): ComplexSet<PublicKey> {
    return this._deviceStateMachine.authorizedDeviceKeys;
  }

  async open() {
    await this._space.open();
  }

  async close() {
    await this._space.close();
  }

  async ready() {
    await this._deviceStateMachine.deviceChainReady.wait();

    // TODO(dmaretskyi): Should we also wait for our feeds to be admitted?
  }

  get profileDocument(): ProfileDocument | undefined {
    return this._profileStateMachine.profile;
  }

  /**
   * @test-only
   */
  get controlPipeline() {
    return this._space.controlPipeline;
  }

  get haloSpaceKey() {
    return this._space.key;
  }

  get haloGenesisFeedKey() {
    return this._space.genesisFeedKey;
  }

  getAdmissionCredentials(): HaloAdmissionCredentials {
    return {
      deviceKey: this.deviceKey,
      controlFeedKey: this._space.controlFeedKey,
      dataFeedKey: this._space.dataFeedKey
    };
  }

  /**
   * Issues credentials as identity.
   * Requires identity to be ready.
   */
  getIdentityCredentialSigner(): CredentialSigner {
    assert(this._deviceStateMachine.deviceCredentialChain, 'Device credential chain is not ready.');
    return createCredentialSignerWithChain(
      this._signer,
      this._deviceStateMachine.deviceCredentialChain,
      this.deviceKey
    );
  }

  /**
   * Issues credentials as device.
   */
  getDeviceCredentialSigner(): CredentialSigner {
    return createCredentialSignerWithKey(this._signer, this.deviceKey);
  }

  async admitDevice({ deviceKey, controlFeedKey, dataFeedKey }: HaloAdmissionCredentials) {
    log('Admitting device:', {
      identityKey: this.identityKey,
      hostDevice: this.deviceKey,
      deviceKey,
      controlFeedKey,
      dataFeedKey
    });
    const signer = this.getIdentityCredentialSigner();
    await writeMessages(
      this.controlPipeline.writer,
      [
        await signer.createCredential({
          subject: deviceKey,
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            identityKey: this.identityKey,
            deviceKey
          }
        }),
        await signer.createCredential({
          subject: controlFeedKey,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            spaceKey: this.haloSpaceKey,
            deviceKey,
            identityKey: this.identityKey,
            designation: AdmittedFeed.Designation.CONTROL
          }
        }),
        await signer.createCredential({
          subject: dataFeedKey,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            spaceKey: this.haloSpaceKey,
            deviceKey,
            identityKey: this.identityKey,
            designation: AdmittedFeed.Designation.DATA
          }
        })
      ].map((credential): TypedMessage => ({ '@type': 'dxos.echo.feed.CredentialsMessage', credential }))
    );
  }
}
