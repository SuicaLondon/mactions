import { describe, expect, it } from 'vitest';

import { selectedOption, selectItems } from './select-options';

const options = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
];

describe('selectItems', () => {
  it('appends the Load more row only when more can be loaded', () => {
    const more = { value: 'more', label: 'Load more' };
    expect(selectItems(options, undefined)).toBe(options);
    expect(selectItems(options, more)).toEqual([...options, more]);
  });
});

describe('selectedOption', () => {
  it('finds the loaded option, keeps an unloaded value, and allows no value', () => {
    expect(selectedOption(options, 'active')).toBe(options[1]);
    expect(selectedOption(options, 'acme/build')).toEqual({
      value: 'acme/build',
      label: 'acme/build',
    });
    expect(selectedOption(options, '')).toBeNull();
  });
});
