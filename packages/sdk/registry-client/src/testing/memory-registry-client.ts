//
// Copyright 2021 DXOS.org
//

import { Root } from 'protobufjs';

import { IQuery, Filtering } from '../queries';
import { IRegistryClient } from '../registry-client-types';
import {
  CID,
  CIDLike,
  Domain,
  DomainKey,
  DXN,
  RecordKind,
  RecordMetadata,
  RegistryDataRecord,
  RegistryRecord,
  RegistryTypeRecord,
  Resource,
  ResourceRecord
} from '../types';
import { createMockTypes, createMockResourceRecords } from './fake-data-generator';

/**
 *
 */
export class MemoryRegistryClient implements IRegistryClient {
  private readonly records: RegistryRecord[]

  constructor (
    private types: RegistryTypeRecord[] = createMockTypes(),
    private resources: ResourceRecord<RegistryRecord>[] = createMockResourceRecords()
  ) {
    this.records = this.resources.map(resource => resource.record);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async addRecord (data: unknown, schemaId: CIDLike, messageFqn: string): Promise<CID> {
    return undefined as unknown as CID;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getResource (id: DXN): Promise<Resource | undefined> {
    const resource = this.resources.find(resource => resource.resource.id.toString() === id.toString());
    return resource?.resource;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getResourceRecord<R extends RegistryRecord = RegistryRecord> (id: DXN, versionOrTag = 'latest'): Promise<ResourceRecord<R> | undefined> {
    const resource = await this.getResource(id);
    if (resource === undefined) {
      return undefined;
    }
    const cid = resource.tags[versionOrTag] ?? resource.versions[versionOrTag];
    if (cid === undefined) {
      return undefined;
    }
    const record = await this.getRecord(cid);
    if (record === undefined) {
      return undefined;
    }
    return {
      resource,
      tag: resource.tags[versionOrTag] ? versionOrTag : undefined,
      version: resource.versions[versionOrTag] ? versionOrTag : undefined,
      record: record as R
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getDomains (): Promise<Domain[]> {
    return [{ key: DomainKey.random(), owners: [], name: 'dxos' }];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getRecord<R extends RegistryRecord = RegistryRecord> (cidLike: CIDLike): Promise<R | undefined> {
    return this.records.find(record => record.cid.equals(cidLike)) as R;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getRecords<R extends RegistryRecord = RegistryRecord> (query?: IQuery): Promise<R[]> {
    return this.records as R[];
  }

  async queryResources (query?: IQuery): Promise<Resource[]> {
    let result = this.resources.map(resource => resource.resource);
    result = result.filter(resource => Filtering.matchResource(resource, query));
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async registerDomain (): Promise<DomainKey> {
    return undefined as unknown as DomainKey;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateResource (): Promise<void> {
    return undefined;
  }

  async deleteResource (): Promise<void> {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async resolveRecordCid (id: DXN): Promise<CID | undefined> {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async resolveDomainName (domainName: string): Promise<DomainKey> {
    return undefined as unknown as DomainKey;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTypeRecords (query?: IQuery): Promise<RegistryTypeRecord[]> {
    return this.types.filter(type => Filtering.matchRecord(type, query));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async insertDataRecord (data: unknown, typeId: CIDLike, meta?: RecordMetadata): Promise<CID> {
    return undefined as unknown as CID;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async insertRawRecord (data: Uint8Array): Promise<CID> {
    return undefined as unknown as CID;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async insertTypeRecord (schema: Root, messageName: string, meta?: RecordMetadata): Promise<CID> {
    return undefined as unknown as CID;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getDataRecord<T = any> (cid: CIDLike): Promise<RegistryDataRecord<T> | undefined> {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTypeRecord (cid: CIDLike): Promise<RegistryTypeRecord | undefined> {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getDataRecords<T = any> (query?: IQuery): Promise<RegistryDataRecord[]> {
    const records = await this.getRecords();

    return records
      .filter((record): record is RegistryDataRecord<T> => record.kind === RecordKind.Data)
      .filter(record => Filtering.matchRecord(record, query));
  }

  async disconnect () {
    return Promise.resolve();
  }
}
