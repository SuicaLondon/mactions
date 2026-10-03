import { describe, expect, it } from 'vitest';

import { cn } from './cn';

describe('cn', () => {
  it('composes base groups, conditional styles, and external overrides', () => {
    expect(cn('flex gap-2 px-2', { 'ring-2 ring-focus': true, hidden: false }, 'px-4')).toBe(
      'flex gap-2 ring-2 ring-focus px-4',
    );
  });

  it('preserves typography alongside shared color tokens and named variants', () => {
    expect(cn('text-xs text-muted', 'text-activity-success', '@max-xl/panel:flex-1')).toBe(
      'text-xs text-activity-success @max-xl/panel:flex-1',
    );
  });

  it('merges Tailwind v4 important modifiers and ignores absent inputs', () => {
    expect(cn('px-2! max-md:px-3', null, false, undefined, 'px-4!')).toBe('max-md:px-3 px-4!');
    expect(cn(undefined, null, false)).toBe('');
  });
});
