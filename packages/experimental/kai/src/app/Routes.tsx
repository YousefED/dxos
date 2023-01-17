//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useRoutes } from 'react-router-dom';

import { Space } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { RequireIdentity } from '@dxos/react-appkit';

import {
  CreateIdentityPage,
  IdentityPage,
  InitPage,
  JoinIdentityPage,
  JoinSpacePage,
  RecoverIdentityPage,
  SettingsPage,
  SpacePage
} from '../pages';

export const matchSpaceKey = (spaces: Space[], spaceKey: string) =>
  spaces.find((space) => space.key.truncate() === spaceKey);

export const createSpacePath = (spaceKey: PublicKey, frame?: string) =>
  `/${spaceKey.truncate()}` + (frame ? `/${frame}` : '');

/**
 * Main app routes.
 */
export const Routes = () => {
  return useRoutes([
    {
      path: '/',
      element: <InitPage />
    },
    {
      path: '/identity/create',
      element: <CreateIdentityPage />
    },
    {
      path: '/identity/recover',
      element: <RecoverIdentityPage />
    },
    {
      path: '/identity/join',
      element: <JoinIdentityPage />
    },
    {
      path: '/',
      element: <RequireIdentity redirect='/' />,
      children: [
        // TODO(wittjosiah): Factor out appbar to a layout.
        {
          path: '/identity',
          element: <IdentityPage />
        },
        {
          path: '/settings',
          element: <SettingsPage />
        },
        {
          path: '/space/join',
          element: <JoinSpacePage />
        },
        {
          path: '/:spaceKey',
          element: <SpacePage />,
          children: [
            {
              path: '/:spaceKey/:frame',
              element: <SpacePage />
            }
          ]
        }
      ]
    }
  ]);
};