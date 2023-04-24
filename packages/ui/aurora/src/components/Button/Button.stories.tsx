//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { PropsWithChildren } from 'react';

import { DensityProvider } from '../DensityProvider';
import { ElevationProvider } from '../ElevationProvider';
import { Button } from './Button';
import { ButtonProps } from './ButtonProps';

export default {
  component: Button
};

const Container = ({ children }: PropsWithChildren<{}>) => (
  <>
    <div role='group' className='flex flex-col gap-4 mbe-4'>
      <ElevationProvider elevation='base'>
        <div className='flex gap-4'>{children}</div>
        <DensityProvider density='fine'>
          <div className='flex gap-4'>{children}</div>
        </DensityProvider>
      </ElevationProvider>
    </div>
    <div role='group' className='flex flex-col gap-4'>
      <ElevationProvider elevation='group'>
        <div className='flex gap-4'>{children}</div>
        <DensityProvider density='fine'>
          <div className='flex gap-4'>{children}</div>
        </DensityProvider>
      </ElevationProvider>
    </div>
  </>
);

export const Default = {
  render: ({ children, ...args }: Omit<ButtonProps, 'ref'>) => (
    <Container>
      <Button {...args}>{children}</Button>
      <Button {...args} disabled>
        Disabled
      </Button>
    </Container>
  ),
  args: { children: 'Hello', disabled: false, variant: 'default' }
};

export const Primary = { ...Default, args: { variant: 'primary', children: 'Hello' } };

export const Outline = { ...Default, args: { variant: 'outline', children: 'Hello' } };

export const Ghost = { ...Default, args: { variant: 'ghost', children: 'Hello' } };