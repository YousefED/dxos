//
// Copyright 2021 DXOS.org
//

import React, { useMemo } from 'react';

import { Box, CssBaseline, ThemeProvider } from '@mui/material';

import { ConfigObject, defs } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';
import { RpcPort, createLinkedPorts } from '@dxos/rpc';

import { ErrorBoundary, PanelsContainer, sections, theme } from '../src';
import { PlaygroundControls } from './helpers';

export default {
  title: 'Playground'
};

const DevTools = ({ port }: { port: RpcPort }) => {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ClientProvider
          config={{
            runtime: {
              client: {
                mode: defs.Runtime.Client.Mode.REMOTE
              }
            }
          }}
          options={{
            rpcPort: port
          }}
        >
          <PanelsContainer sections={sections} />
        </ClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

// TODO(burdon): ErrorBoundary with indicator.
export const Controls = () => {
  return (
    <FullScreen sx={{ alignItems: 'center', backgroundColor: '#EEE' }}>
      <ClientProvider>
        <PlaygroundControls />
      </ClientProvider>
    </FullScreen>
  );
};

export const Primary = () => {
  const [controlsPort, devtoolsPort] = useMemo(() => createLinkedPorts(), []);
  const config: ConfigObject = {
    runtime: {
      client: {
        // Automatic mode doesn't work because it doesn't start up fast enough.
        // The devtools remote client fails to connect when controls use the automatic mode.
        mode: defs.Runtime.Client.Mode.LOCAL
      },
      services: {
        signal: {
          // TODO(burdon): Fallback.
          server: 'wss://demo.kube.dxos.network/dxos/signal'
          // server: 'ws://localhost:4000'
        }
      }
    }
  };

  return (
    <FullScreen sx={{ flexDirection: 'row' }}>
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <DevTools port={devtoolsPort} />
      </Box>

      <ClientProvider config={config}>
        <Box sx={{ display: 'flex', flexShrink: 0 }}>
          <PlaygroundControls port={controlsPort} />
        </Box>
      </ClientProvider>
    </FullScreen>
  );
};
