import { expect, it } from 'vitest';

import { emptyLogSearch, type LogSearch } from './job-log-search';
import {
  activeMatchIndex,
  firstMatchFromLine,
  logSearchCounter,
  stepLogSearchPosition,
} from './log-search-position';

function searchWith(count: number, capped = false): LogSearch {
  const matches = Array.from({ length: count }, (_, index) => ({
    line: index + 1,
    start: 0,
    end: 1,
  }));
  return { matches, byLine: new Map(), capped };
}

it('starts a new query at the first match and keeps the index inside the matches', () => {
  const matches = searchWith(5).matches;
  expect(activeMatchIndex({ query: 'old', index: 3 }, 'new', matches)).toBe(0);
  expect(activeMatchIndex({ query: 'q', index: 3 }, 'q', matches)).toBe(3);
  expect(activeMatchIndex({ query: 'q', index: 7 }, 'q', matches)).toBe(4);
  expect(activeMatchIndex({ query: 'q', index: 2 }, 'q', [])).toBe(0);
});

it('starts a new query at the first match on or after the line being read', () => {
  const matches = [10, 400, 980, 990].map((line) => ({ line, start: 0, end: 1 }));
  expect(firstMatchFromLine(matches, 1)).toBe(0);
  expect(firstMatchFromLine(matches, 975)).toBe(2);
  expect(firstMatchFromLine(matches, 980)).toBe(2);
  // Every match is above the line, so the search wraps to the top.
  expect(firstMatchFromLine(matches, 995)).toBe(0);
  expect(firstMatchFromLine([], 50)).toBe(0);
  expect(activeMatchIndex({ query: 'old', index: 0 }, 'new', matches, 975)).toBe(2);
  // A chosen match keeps its place after the reader scrolls.
  expect(activeMatchIndex({ query: 'q', index: 1 }, 'q', matches, 975)).toBe(1);
});

it('wraps match steps in both directions', () => {
  expect(stepLogSearchPosition(2, 'q', 3, 1)).toEqual({ query: 'q', index: 0 });
  expect(stepLogSearchPosition(0, 'q', 3, -1)).toEqual({ query: 'q', index: 2 });
  expect(stepLogSearchPosition(0, 'q', 3, 1)).toEqual({ query: 'q', index: 1 });
});

it('describes the match counter', () => {
  expect(logSearchCounter(emptyLogSearch, '', 0)).toBe('');
  expect(logSearchCounter(emptyLogSearch, 'x', 0)).toBe('No matches');
  expect(logSearchCounter(searchWith(3), 'x', 1)).toBe('2 of 3');
  expect(logSearchCounter(searchWith(3, true), 'x', 0)).toBe('1 of 3+');
});
