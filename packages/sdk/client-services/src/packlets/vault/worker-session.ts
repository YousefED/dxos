//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { asyncTimeout, Trigger } from '@dxos/async';
import { log, logInfo } from '@dxos/log';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';
import { Callback } from '@dxos/util';

import { clientServiceBundle, ClientServices } from '../services';
import { IframeServiceBundle, iframeServiceBundle, workerServiceBundle } from './services';

export type WorkerSessionParams = {
  getService: <Service>(find: (services: Partial<ClientServices>) => Service | undefined) => Promise<Service>;
  systemPort: RpcPort;
  appPort: RpcPort;
  shellPort: RpcPort;
  readySignal: Trigger<Error | undefined>;
  options?: {
    heartbeatInterval: number;
  };
};

/**
 * Represents a tab connection within the worker.
 */
export class WorkerSession {
  private readonly _clientRpc: ProtoRpcPeer<ClientServices>;
  private readonly _shellClientRpc: ProtoRpcPeer<ClientServices>;
  private readonly _iframeRpc: ProtoRpcPeer<IframeServiceBundle>;
  private readonly _startTrigger = new Trigger();
  private readonly _getService: WorkerSessionParams['getService'];
  private readonly _options: NonNullable<WorkerSessionParams['options']>;
  private _heartbeatTimer?: NodeJS.Timeout;

  public readonly onClose = new Callback<() => Promise<void>>();

  @logInfo
  public origin?: string;

  public bridgeService?: BridgeService;

  constructor({
    getService,
    systemPort,
    appPort,
    shellPort,
    options = {
      heartbeatInterval: 1_000
    }
  }: WorkerSessionParams) {
    assert(options);
    assert(getService);
    this._options = options;
    this._getService = getService;

    const handlers = {
      DataService: async () => await this._getService((services) => services.DataService),
      DevicesService: async () => await this._getService((services) => services.DevicesService),
      DevtoolsHost: async () => await this._getService((services) => services.DevtoolsHost),
      HaloInvitationsService: async () => await this._getService((services) => services.HaloInvitationsService),
      NetworkService: async () => await this._getService((services) => services.NetworkService),
      IdentityService: async () => await this._getService((services) => services.IdentityService),
      SpaceInvitationsService: async () => await this._getService((services) => services.SpaceInvitationsService),
      SpaceService: async () => await this._getService((services) => services.SpaceService),
      SpacesService: async () => await this._getService((services) => services.SpacesService),
      SystemService: async () => await this._getService((services) => services.SystemService),
      TracingService: async () => await this._getService((services) => services.TracingService)
    };

    this._clientRpc = createProtoRpcPeer({ exposed: clientServiceBundle, handlers, port: appPort });
    this._shellClientRpc = createProtoRpcPeer({ exposed: clientServiceBundle, handlers, port: shellPort });

    this._iframeRpc = createProtoRpcPeer({
      requested: iframeServiceBundle,
      exposed: workerServiceBundle,
      handlers: {
        WorkerService: {
          start: async (request) => {
            this.origin = request.origin;
            this._startTrigger.wake();
          },

          stop: async () => {
            setTimeout(async () => {
              try {
                await this.close();
              } catch (err: any) {
                log.catch(err);
              }
            });
          }
        }
      },
      port: systemPort,
      timeout: 1000 // With low timeout heartbeat may fail if the tab's thread is saturated.
    });

    this.bridgeService = this._iframeRpc.rpc.BridgeService;
  }

  async open() {
    log.info('opening..');
    await Promise.all([this._clientRpc.open(), this._iframeRpc.open(), this._maybeOpenShell()]);

    await this._startTrigger.wait({ timeout: 3_000 });

    // Detect if bridge is present.
    // TODO(burdon): Add heartbeat to client's System service.
    //  How do we detect if the client's tab closed?
    this._heartbeatTimer = setInterval(async () => {
      try {
        await this._iframeRpc.rpc.IframeService.heartbeat();
      } catch (err) {
        log.warn('Heartbeat failed', { err });
        try {
          await this.close();
        } catch (err: any) {
          log.catch(err);
        }
      }
    }, this._options.heartbeatInterval);
  }

  async close() {
    log.info('closing..');
    try {
      await this.onClose.callIfSet();
    } catch (err: any) {
      log.catch(err);
    }

    if (this._heartbeatTimer !== undefined) {
      clearInterval(this._heartbeatTimer);
    }

    await Promise.all([this._clientRpc.close(), this._iframeRpc.close()]);
  }

  private async _maybeOpenShell() {
    try {
      await asyncTimeout(this._shellClientRpc.open(), 1_000);
    } catch {
      log.info('No shell connected.');
    }
  }
}
