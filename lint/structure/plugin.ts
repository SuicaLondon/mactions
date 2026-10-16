import type { TSESLint } from '@typescript-eslint/utils';

import componentBoundaries from './component-boundaries.ts';
import typescriptOnly from './typescript-only.ts';

export default {
  meta: { name: 'mactions-structure' },
  rules: { 'component-boundaries': componentBoundaries, 'typescript-only': typescriptOnly },
} satisfies TSESLint.FlatConfig.Plugin;
