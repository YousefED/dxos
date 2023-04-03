//
// Copyright 2023 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React, { FC, PropsWithChildren } from 'react';
import { Outlet } from 'react-router-dom';

import { fromHost } from '@dxos/client-services';
import { Defaults, Dynamics, Envs } from '@dxos/config';
import { appkitTranslations, ErrorProvider, FatalError } from '@dxos/react-appkit';
import { ClientProvider, Config } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';
import { osTranslations } from '@dxos/react-ui';

const Fullscreen: FC<PropsWithChildren> = ({ children }) => {
  return <div className='flex flex-col overflow-hidden absolute left-0 right-0 top-0 bottom-0'>{children}</div>;
};

export const Root: FC<PropsWithChildren> = ({ children }) => {
  const configProvider = async () => new Config(await Dynamics(), await Envs(), Defaults());

  return (
    <ThemeProvider appNs='console' rootDensity='fine' resourceExtensions={[appkitTranslations, osTranslations]}>
      <ErrorProvider>
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider config={configProvider} services={fromHost}>
            <Fullscreen>
              <Outlet />
            </Fullscreen>
            {children}
          </ClientProvider>
        </ErrorBoundary>
      </ErrorProvider>
    </ThemeProvider>
  );
};