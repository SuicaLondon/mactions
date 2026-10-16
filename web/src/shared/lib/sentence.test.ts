import { expect, it } from 'vitest';

import { sentence } from './sentence';

it.each([
  ['Missing capabilities', 'Missing capabilities.'],
  [' Done. ', 'Done.'],
  ['Retry?', 'Retry?'],
  ['Stop!', 'Stop!'],
  ['  ', ''],
])('sentence(%j) is %j', (message, expected) => {
  expect(sentence(message)).toBe(expected);
});
