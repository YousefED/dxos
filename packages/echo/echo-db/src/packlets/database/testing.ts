//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/crypto';
import { EchoEnvelope, MockFeedWriter, Timeframe } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';

import { DataServiceHost } from './data-service-host';
import { DataServiceRouter } from './data-service-router';
import { Database } from './database';
import { FeedDatabaseBackend, RemoteDatabaseBackend } from './database-backend';

export const createInMemoryDatabase = async (modelFactory: ModelFactory) => {
  const feed = new MockFeedWriter<EchoEnvelope>();
  const backend = new FeedDatabaseBackend(feed, undefined, { snapshots: true });
  feed.written.on(([data, meta]) => backend.echoProcessor({ data, meta: { ...meta, memberKey: PublicKey.random(), timeframe: new Timeframe([[meta.feedKey, meta.seq]]) } }));
  const database = new Database(
    modelFactory,
    backend,
    PublicKey.random()
  );

  await database.initialize();
  return database;
};

export const createRemoteDatabaseFromDataServiceHost = async (
  modelFactory: ModelFactory,
  dataServiceHost: DataServiceHost
) => {
  const partyKey = PublicKey.random();
  const dataServiceRouter = new DataServiceRouter();
  dataServiceRouter.trackParty(partyKey, dataServiceHost);

  const frontend = new Database(
    modelFactory,
    new RemoteDatabaseBackend(dataServiceRouter, partyKey),
    PublicKey.random()
  );
  await frontend.initialize();
  return frontend;
};