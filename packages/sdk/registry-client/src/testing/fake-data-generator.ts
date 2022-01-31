//
// Copyright 2021 DXOS.org
//

import faker from 'faker';
import * as protobuf from 'protobufjs';

import { sanitizeExtensionData } from '../encoding';
import { schemaJson } from '../proto';
import { CID, DXN, RecordKind, RegistryDataRecord, RegistryTypeRecord, ResourceRecord } from '../types';

export interface CreateMockResourceRecordOptions {
  _dxn?: DXN,
  _typeCID?: CID,
  _data?: any
}

export const mockTypeNames = [
  {
    type: 'dxos.type.KUBE',
    label: 'KUBE'
  },
  {
    type: 'dxos.type.Service',
    label: 'KUBE Service'
  },
  {
    type: 'dxos.type.IPFS',
    label: 'IPFS service'
  },
  {
    type: 'file',
    label: 'File'
  },
  {
    type: 'app',
    label: 'App'
  },
  {
    type: 'bot',
    label: 'Bot'
  }
];

export const createCID = (): CID => {
  return CID.from(Uint8Array.from(Array.from({ length: 34 }).map(() => Math.floor(Math.random() * 255))));
};

export const createDxn = (): DXN => {
  return DXN.fromDomainName('dxos', faker.internet.domainWord());
};

export const createMockResourceRecord = ({
  _dxn,
  _typeCID,
  _data
} : CreateMockResourceRecordOptions = {}): ResourceRecord => {
  const dxn = _dxn || createDxn();
  const type = faker.random.arrayElement(mockTypes);

  const record: RegistryDataRecord = {
    kind: RecordKind.Data,
    cid: createCID(),
    type: _typeCID ?? type.cid,
    meta: {},
    dataSize: 0,
    dataRaw: new Uint8Array(),
    data: sanitizeExtensionData(_data ?? {}, type.cid)
  };

  return {
    resource: {
      id: dxn,
      tags: {
        latest: record.cid
      },
      versions: {}
    },
    record: record
  };
};

export const createMockRecord = (): RegistryDataRecord => {
  const type = faker.random.arrayElement(mockTypes);

  return {
    kind: RecordKind.Data,
    cid: createCID(),
    type: type.cid,
    meta: {},
    dataSize: 0,
    dataRaw: new Uint8Array(),
    data: sanitizeExtensionData({}, type.cid)
  };
};

const defs = protobuf.Root.fromJSON(schemaJson);

const mockTypes = mockTypeNames.map((item): RegistryTypeRecord => ({
  cid: createCID(),
  kind: RecordKind.Type,
  meta: {
    created: faker.date.recent(30)
  },
  messageName: item.type,
  protobufDefs: defs
}));

export const createMockTypes = () => mockTypes;

export const createMockResourceRecords = () => Array.from({ length: 30 }).map(() => createMockResourceRecord());
