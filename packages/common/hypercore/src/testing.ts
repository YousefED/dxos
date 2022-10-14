//
// Copyright 2019 DXOS.org
//

// @dxos/mocha platform=nodejs

import faker from 'faker';

// TODO(burdon): Replace with proto.
export type TestDataItem = { id: number, text: string }

export const createDataItem = (n: number): TestDataItem => ({
  id: n,
  text: faker.lorem.sentence()
});

type BatchCallback = (next: (num: number) => void, index: number, remaining: number) => void

export const batch = (cb: BatchCallback, total: number) => {
  let i = 0;
  const f = () => {
    const remaining = total - i;
    cb((num = 1) => {
      i += num;
      if (i < total) {
        f();
      }
    }, i, remaining);
  };

  f();
};