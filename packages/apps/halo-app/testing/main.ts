//
// Copyright 2022 DXOS.org
//

import { Client, fromIFrame } from '@dxos/client';
import { log } from '@dxos/log';

void (async () => {
  const client = new Client({ services: fromIFrame() });
  await client.initialize();

  if (!client.halo.identity) {
    await client.halo.createIdentity();
  }

  log('client', client.toJSON());

  await client.destroy();
})();
