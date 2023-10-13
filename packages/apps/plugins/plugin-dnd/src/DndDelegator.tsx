//
// Copyright 2023 DXOS.org
//

import React, { forwardRef, type ForwardRefExoticComponent } from 'react';

import { type DelegatorProps } from '@dxos/aurora-grid';
import { Surface } from '@dxos/react-surface';

export const DndDelegator: ForwardRefExoticComponent<DelegatorProps> = forwardRef<HTMLElement, DelegatorProps>(
  (props, forwardedRef) => {
    return <Surface role='mosaic-delegator' limit={1} data={props} ref={forwardedRef} />;
  },
);
