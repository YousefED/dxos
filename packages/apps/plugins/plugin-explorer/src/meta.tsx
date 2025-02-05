//
// Copyright 2023 DXOS.org
//

import { Graph, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const EXPLORER_PLUGIN = 'dxos.org/plugin/explorer';

export default pluginMeta({
  id: EXPLORER_PLUGIN,
  name: 'Explorer',
  iconComponent: (props: IconProps) => <Graph {...props} />,
});
