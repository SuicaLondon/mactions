import { describe, expect, it } from 'vitest';

import { toggleExpandedId, withExpandedId } from './expanded-ids';

describe('toggleExpandedId', () => {
  it('opens an id once and closes it again', () => {
    expect(toggleExpandedId([1], 2, true)).toEqual([1, 2]);
    expect(toggleExpandedId([1, 2], 2, true)).toEqual([1, 2]);
    expect(toggleExpandedId([1, 2], 1, false)).toEqual([2]);
    expect(toggleExpandedId([], 3, false)).toEqual([]);
  });
});

describe('withExpandedId', () => {
  it('keeps the same list when the id is already open', () => {
    const ids = [4, 5];
    expect(withExpandedId(ids, 5)).toBe(ids);
    expect(withExpandedId(ids, 6)).toEqual([4, 5, 6]);
  });
});
