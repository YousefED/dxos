//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { log } from '@dxos/log';
import { ServiceWorkerToast } from '@dxos/react-appkit';
import { PluginDefinition } from '@dxos/react-surface';
import { captureException } from '@dxos/sentry';

export const PwaPlugin = (): PluginDefinition => ({
  meta: {
    id: 'dxos:pwa',
  },
  provides: {
    context: ({ children }) => {
      const {
        offlineReady: [offlineReady, _setOfflineReady],
        needRefresh: [needRefresh, _setNeedRefresh],
        updateServiceWorker,
      } = useRegisterSW({
        onRegisterError: (err) => {
          captureException(err);
          log.error(err);
        },
      });

      return (
        <>
          {children}
          {needRefresh ? (
            <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
          ) : offlineReady ? (
            <ServiceWorkerToast variant='offlineReady' />
          ) : null}
        </>
      );
    },
  },
});