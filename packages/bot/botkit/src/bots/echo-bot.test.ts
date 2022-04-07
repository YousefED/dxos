//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { PublicKey } from '@dxos/crypto';
import { ObjectModel } from '@dxos/object-model';

import { setupClient } from '../testutils';
import { EchoBot, TEST_ECHO_TYPE } from './echo-bot';

describe('Echo Bot', () => {
  it('Starts a bot', async () => {
    const { client, party, invitation } = await setupClient();
    const bot = new EchoBot(TEST_ECHO_TYPE);

    await bot.initialize({
      invitation
    });

    const command = PublicKey.random().asUint8Array();
    await bot.command({ command: command });

    const item = await party.database.waitForItem<ObjectModel>({ type: TEST_ECHO_TYPE });
    const payload = item.model.get('payload');
    expect(PublicKey.from(payload).toString()).toBe(PublicKey.from(command).toString());

    await bot.stop();
    await client.destroy();
  });
});
