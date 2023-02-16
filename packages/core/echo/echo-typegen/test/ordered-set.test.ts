//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { EchoArray } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';

import { Task } from './proto';
import { createDatabase } from '@dxos/echo-schema/testing';

// TODO(burdon): Test with/without saving to database.

describe('ordered-set', () => {
  // TODO(burdon): Test clear/reset (set length = 0).
  test('assignment', async () => {
    const root = new Task();
    expect(root.subTasks).to.have.length(0);

    root.subTasks.push(new Task());
    root.subTasks.push(new Task());
    root.subTasks.push(new Task());
    root.subTasks.push(new Task(), new Task());
    expect(root.subTasks).to.have.length(5);
    expect(root.subTasks.length).to.eq(5);
    expect(JSON.parse(JSON.stringify(root, undefined, 2)).subTasks).to.have.length(5);

    // Iterators.
    const ids = root.subTasks.map((task) => task.id);
    root.subTasks.forEach((task, i) => expect(task.id).to.eq(ids[i]));
    expect(Array.from(root.subTasks.values())).to.have.length(5);

    root.subTasks = [new Task(), new Task(), new Task()];
    expect(root.subTasks.length).to.eq(3);

    const db = await createDatabase()
    await db.add(root);
  });

  test('splice', async () => {
    const root = new Task();
    root.subTasks = new EchoArray([new Task(), new Task(), new Task()]);
    root.subTasks.splice(0, 2, new Task());
    expect(root.subTasks).to.have.length(2);

    const db = await createDatabase()
    await db.add(root);
  });
});
