//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Item } from '@dxos/echo-db';

import { Document, isDocument } from './document';
import { EchoObject } from './object';

export type PropertiesFilter = Record<string, any>;
export type OperatorFilter<T extends Document> = (document: T) => boolean;
export type Filter<T extends Document> = PropertiesFilter | OperatorFilter<T>;

// NOTE: `__phantom` property forces type.
export type TypeFilter<T extends Document> = { __phantom: T } & Filter<T>;

export type Subscription = () => void;

// TODO(burdon): Create general base class for this.
export class Query<T extends Document = Document> {
  constructor(
    private readonly _dbObjects: Map<string, EchoObject>,
    private readonly _updateEvent: Event<Item[]>,
    private readonly _filter: Filter<any>
  ) {}

  private _cache: T[] | undefined;

  get objects(): T[] {
    if (!this._cache) {
      // TODO(burdon): Sort.
      this._cache = Array.from(this._dbObjects.values()).filter((obj): obj is T => filterMatcher(this._filter, obj));
    }

    return this._cache;
  }

  subscribe(callback: (query: Query<T>) => void): Subscription {
    return this._updateEvent.on((updated) => {
      const changed = updated.some((object) => {
        if (this._dbObjects.has(object.id)) {
          const match = filterMatcher(this._filter, this._dbObjects.get(object.id)!);
          const exists = this._cache?.find((obj) => obj.id === object.id);
          return match || (exists && !match);
        } else {
          return false;
        }
      });

      if (changed) {
        this._cache = undefined;
        callback(this);
      }
    });
  }
}

// TODO(burdon): Create separate test.
const filterMatcher = (filter: Filter<any>, object: EchoObject): object is Document => {
  if (!isDocument(object)) {
    return false;
  }
  if (object.__deleted) {
    return false;
  }

  if (typeof filter === 'object' && filter['@type'] && object.__typename !== filter['@type']) {
    return false;
  }

  if (typeof filter === 'function') {
    return filter(object);
  } else if (typeof filter === 'object' && filter !== null) {
    for (const key in filter) {
      if (key === '@type') {
        continue;
      }
      if ((object as any)[key] !== filter[key]) {
        return false;
      }
    }
  }

  return true;
};