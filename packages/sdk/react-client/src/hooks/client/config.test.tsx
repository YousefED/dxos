//
// Copyright 2020 DXOS.org
//

import { renderHook } from '@testing-library/react';
import expect from 'expect';
import React from 'react';

import { Client } from '@dxos/client';
import { ConfigProto } from '@dxos/config';

import { ClientProvider } from '../../containers';
import { useConfig } from './useConfig';

describe('Config hook', () => {
  const render = () => useConfig();

  it.skip('should throw when used outside a context', () => {
    expect(renderHook(render)).toThrow();
  });

  it('should return default client config when no config is passed in a context', () => {
    const client = new Client({});
    const wrapper = ({ children }: any) => <ClientProvider client={client}>{children}</ClientProvider>;
    const { result } = renderHook(render, { wrapper });
    expect(Object.entries(result.current).length).toBeGreaterThan(0);
  });

  it('should return custom client config when used properly in a context', () => {
    const config: ConfigProto = {
      version: 1,
      runtime: {
        client: {
          storage: {
            persistent: false
          }
        }
      }
    };
    const client = new Client(config);
    const wrapper = ({ children }: any) => <ClientProvider client={client}>{children}</ClientProvider>;
    const { result } = renderHook(render, { wrapper });
    expect(result.current.get('runtime.client.storage')).toEqual(config.runtime?.client?.storage);
  });
});
