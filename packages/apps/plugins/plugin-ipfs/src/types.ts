//
// Copyright 2023 DXOS.org
//

import { File as FileType } from '@braneframe/types';
import type { MetadataRecordsProvides, SurfaceProvides, TranslationsProvides } from '@dxos/app-framework';
import { isTypedObject } from '@dxos/react-client/echo';

import { IPFS_PLUGIN } from './meta';

const IPFS_ACTION = `${IPFS_PLUGIN}/action`;

export enum IpfsAction {
  CREATE = `${IPFS_ACTION}/create`,
}

export type IpfsProvides = {};

export type IpfsPluginProvides = SurfaceProvides & MetadataRecordsProvides & TranslationsProvides;

export const isFile = (object: unknown): object is FileType => {
  return isTypedObject(object) && FileType.schema.typename === object.__typename;
};
