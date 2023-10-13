//
// Copyright 2023 DXOS.org
//

import { type IconProps, StackSimple, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import type { Node } from '@braneframe/plugin-graph';
import { SpaceAction } from '@braneframe/plugin-space';
import { type Stack as StackType } from '@braneframe/types';
import { type Space, isTypedObject } from '@dxos/client/echo';

import {
  type GenericStackObject,
  STACK_PLUGIN,
  type StackModel,
  type StackObject,
  type StackProperties,
} from './types';

export const isStack = <T extends StackObject = GenericStackObject>(data: unknown): data is StackModel<T> =>
  data && typeof data === 'object'
    ? 'id' in data &&
      typeof data.id === 'string' &&
      typeof (data as { [key: string]: any }).sections === 'object' &&
      typeof (data as { [key: string]: any }).sections?.length === 'number'
    : false;

export const isStackProperties = (data: unknown): data is StackProperties => isTypedObject(data);

export const stackToGraphNode = (parent: Node<Space>, object: StackType, index: string): Node => {
  const [child] = parent.addNode(STACK_PLUGIN, {
    id: object.id,
    label: object.title ?? ['stack title placeholder', { ns: STACK_PLUGIN }],
    icon: (props: IconProps) => <StackSimple {...props} />,
    data: object,
    properties: {
      index: get(object, 'meta.index', index),
      persistenceClass: 'spaceObject',
    },
  });

  child.addAction({
    id: 'delete',
    label: ['delete stack label', { ns: STACK_PLUGIN }],
    icon: (props: IconProps) => <Trash {...props} />,
    intent: {
      action: SpaceAction.REMOVE_OBJECT,
      data: { spaceKey: parent.data?.key.toHex(), objectId: object.id },
    },
  });

  return child;
};
