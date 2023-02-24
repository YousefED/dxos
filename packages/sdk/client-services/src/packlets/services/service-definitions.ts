//
// Copyright 2020 DXOS.org
//

import { schema } from '@dxos/protocols';
import {
  DevicesService,
  DeviceInvitationsService,
  IdentityService,
  NetworkService,
  SpaceInvitationsService,
  SpacesService,
  SystemService
} from '@dxos/protocols/proto/dxos/client/services';
import { DevtoolsHost, TracingService } from '@dxos/protocols/proto/dxos/devtools/host';
import { DataService } from '@dxos/protocols/proto/dxos/echo/service';
import { createServiceBundle, ServiceBundle } from '@dxos/rpc';

//
// NOTE: Should contain client/proxy dependencies only.
//

export type ClientServices = {
  SystemService: SystemService;

  IdentityService: IdentityService;
  DeviceInvitationsService: DeviceInvitationsService;
  DevicesService: DevicesService;

  SpaceInvitationsService: SpaceInvitationsService;
  SpacesService: SpacesService;
  DataService: DataService;

  NetworkService: NetworkService;

  // TODO(burdon): Deprecated.
  DevtoolsHost: DevtoolsHost;
  TracingService: TracingService;
};

/**
 * Provide access to client services definitions and service handler.
 */
export interface ClientServicesProvider {
  descriptors: ServiceBundle<ClientServices>;
  services: Partial<ClientServices>;

  open(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Services supported by host.
 */
export const clientServiceBundle = createServiceBundle<ClientServices>({
  SystemService: schema.getService('dxos.client.services.SystemService'),
  IdentityService: schema.getService('dxos.client.services.IdentityService'),
  DeviceInvitationsService: schema.getService('dxos.client.services.DeviceInvitationsService'),
  DevicesService: schema.getService('dxos.client.services.DevicesService'),
  SpaceInvitationsService: schema.getService('dxos.client.services.SpaceInvitationsService'),
  SpacesService: schema.getService('dxos.client.services.SpacesService'),
  DataService: schema.getService('dxos.echo.service.DataService'),
  NetworkService: schema.getService('dxos.client.services.NetworkService'),

  // TODO(burdon): Deprecated.
  DevtoolsHost: schema.getService('dxos.devtools.host.DevtoolsHost'),
  TracingService: schema.getService('dxos.devtools.host.TracingService')
});
