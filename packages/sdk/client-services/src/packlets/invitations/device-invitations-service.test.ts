//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import assert from 'node:assert';
import waitForExpect from 'wait-for-expect';

import { asyncChain, Trigger } from '@dxos/async';
import { InvitationsProxy } from '@dxos/client';
import { raise } from '@dxos/debug';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { describe, test, afterTest } from '@dxos/test';

import { ServiceContext } from '../services';
import { createPeers } from '../testing';
import { InvitationsServiceImpl } from './invitations-service';

const closeAfterTest = async (peer: ServiceContext) => {
  afterTest(() => peer.close());
  return peer;
};

describe('services/device-invitation-service', () => {
  test('creates identity and invites peer', async () => {
    const [host, guest] = await asyncChain<ServiceContext>([closeAfterTest])(createPeers(2));

    await host.identityManager.createIdentity();
    expect(host.identityManager.identity!.authorizedDeviceKeys.size).to.eq(1);

    const service1 = new InvitationsServiceImpl(host.invitations, (invitation) =>
      host.getInvitationHandler(invitation)
    );
    const service2 = new InvitationsServiceImpl(guest.invitations, (invitation) =>
      guest.getInvitationHandler(invitation)
    );

    const success1 = new Trigger<Invitation>();
    const success2 = new Trigger<Invitation>();

    const authCode = new Trigger<string>();

    {
      const proxy1 = new InvitationsProxy(service1, () => ({ kind: Invitation.Kind.DEVICE }));
      const observable1 = proxy1.createInvitation();
      observable1.subscribe(
        (invitation: Invitation) => {
          switch (invitation.state) {
            case Invitation.State.CONNECTING: {
              const proxy2 = new InvitationsProxy(service2, () => ({ kind: Invitation.Kind.DEVICE }));
              const observable2 = proxy2.acceptInvitation(invitation);
              observable2.subscribe(
                async (invitation) => {
                  switch (invitation.state) {
                    case Invitation.State.AUTHENTICATING: {
                      await observable2.authenticate(await authCode.wait());
                      break;
                    }

                    case Invitation.State.SUCCESS: {
                      // TODO(burdon): No device.
                      // expect(guest.identityManager.identity!.authorizedDeviceKeys.size).to.eq(1);
                      success2.wake(invitation);
                      break;
                    }
                  }
                },
                (err: Error) => raise(new Error(err.message))
              );
              break;
            }

            case Invitation.State.CONNECTED: {
              assert(invitation.authCode);
              authCode.wake(invitation.authCode);
              break;
            }

            case Invitation.State.SUCCESS: {
              success1.wake(invitation);
              break;
            }
          }
        },
        (err: Error) => raise(new Error(err.message))
      );
    }

    // Check same identity.
    const [invitation1, invitation2] = await Promise.all([success1.wait(), success2.wait()]);
    expect(invitation1.identityKey).not.to.exist;
    expect(invitation2.identityKey).to.deep.eq(host.identityManager.identity!.identityKey);
    expect(invitation2.identityKey).to.deep.eq(guest.identityManager.identity!.identityKey);
    expect(invitation1.state).to.eq(Invitation.State.SUCCESS);
    expect(invitation2.state).to.eq(Invitation.State.SUCCESS);

    // Check devices.
    // TODO(burdon): Incorrect number of devices.
    await waitForExpect(() => {
      expect(host.identityManager.identity!.authorizedDeviceKeys.size).to.eq(2);
      expect(guest.identityManager.identity!.authorizedDeviceKeys.size).to.eq(2);
    });
    // console.log(host.identityManager.identity!.authorizedDeviceKeys.size);
    // console.log(guest.identityManager.identity!.authorizedDeviceKeys.size);
  });
});
