import type { TSESLint } from '@typescript-eslint/utils';

import componentBoundaries from './component-boundaries.ts';

export default {
  meta: { name: 'mactions-structure' },
  rules: { 'component-boundaries': componentBoundaries },
} satisfies TSESLint.FlatConfig.Plugin;
