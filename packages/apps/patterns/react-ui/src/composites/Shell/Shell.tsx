//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { ShellRuntime } from '@dxos/client';
import { LayoutRequest, ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { useClient, useSpace, useSpaces } from '@dxos/react-client';

import { DevicesDialog } from '../DevicesDialog';
import { JoinDialog } from '../JoinDialog';
import { SpaceDialog } from '../SpaceDialog';

export const Shell = ({ runtime, origin }: { runtime: ShellRuntime; origin: string }) => {
  const [{ layout, invitationCode, spaceKey }, setLayout] = useState<LayoutRequest>({
    layout: runtime.layout,
    invitationCode: runtime.invitationCode,
    spaceKey: runtime.spaceKey
  });

  const client = useClient();
  const spaces = useSpaces();
  const space = useSpace(spaceKey);

  useEffect(() => {
    return runtime.layoutUpdate.on((request) => setLayout(request));
  }, [runtime]);

  switch (layout) {
    case ShellLayout.INITIALIZE_IDENTITY:
      return (
        <JoinDialog
          mode='halo-only'
          initialInvitationCode={invitationCode}
          onDone={async () => {
            // TODO(wittjosiah): Is this app-specific?
            spaces.length > 0 || (await client.echo.createSpace());
            await runtime.setAppContext({ display: ShellDisplay.NONE });
            runtime.setLayout(ShellLayout.DEFAULT);
          }}
        />
      );

    case ShellLayout.DEVICE_INVITATIONS:
      return (
        <DevicesDialog
          createInvitationUrl={(invitationCode) => `${origin}?haloInvitationCode=${invitationCode}`}
          onDone={async () => {
            await runtime.setAppContext({ display: ShellDisplay.NONE });
            runtime.setLayout(ShellLayout.DEFAULT);
          }}
        />
      );

    case ShellLayout.SPACE_INVITATIONS:
      return (
        <SpaceDialog
          space={space}
          createInvitationUrl={(invitationCode) => `${origin}?spaceInvitationCode=${invitationCode}`}
          onDone={async () => {
            await runtime.setAppContext({ display: ShellDisplay.NONE });
            runtime.setLayout(ShellLayout.DEFAULT);
          }}
        />
      );

    case ShellLayout.JOIN_SPACE:
      return (
        <JoinDialog
          initialInvitationCode={invitationCode}
          onDone={async (result) => {
            await runtime.setAppContext({ display: ShellDisplay.NONE, spaceKey: result?.spaceKey ?? undefined });
            runtime.setLayout(ShellLayout.DEFAULT);
          }}
          onExit={async () => {
            await runtime.setAppContext({ display: ShellDisplay.NONE });
            runtime.setLayout(ShellLayout.DEFAULT);
          }}
        />
      );

    default:
      return null;
  }
};
