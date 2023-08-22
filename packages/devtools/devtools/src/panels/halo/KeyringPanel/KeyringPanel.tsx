//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { createColumnBuilder, GridColumnDef } from '@dxos/aurora-grid';
import { PublicKey } from '@dxos/keys';
import { KeyRecord } from '@dxos/protocols/proto/dxos/halo/keyring';
import { useDevtools, useStream } from '@dxos/react-client/devtools';

import { MasterDetailTable } from '../../../components';

const { helper, builder } = createColumnBuilder<KeyRecord>();
const columns: GridColumnDef<KeyRecord, any>[] = [
  helper.accessor((record) => PublicKey.from(record.publicKey), {
    id: 'public',
    ...builder.createKey({ header: 'public key', tooltip: true }),
  }),
  helper.accessor((record) => record.privateKey && PublicKey.from(record.privateKey), {
    id: 'private',
    ...builder.createKey({ header: 'private key', tooltip: true }),
  }),
];

export const KeyringPanel = () => {
  const devtoolsHost = useDevtools();
  const { keys } = useStream(() => devtoolsHost.subscribeToKeyringKeys({}), {});
  if (keys === undefined) {
    return null;
  }

  return <MasterDetailTable columns={columns} data={keys} />;
};
