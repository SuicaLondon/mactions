import type { TSESLint } from '@typescript-eslint/utils';

import classComposition from './class-composition.ts';
import tailwindConventions from './tailwind-conventions.ts';

const cnPlugin = {
  meta: { name: 'mactions-cn-conventions' },
  rules: {
    'class-composition': classComposition,
    'tailwind-conventions': tailwindConventions,
  },
} satisfies TSESLint.FlatConfig.Plugin;

const recommended = {
  plugins: { cn: cnPlugin },
  rules: {
    'cn/class-composition': 'error',
    'cn/tailwind-conventions': 'error',
  },
} satisfies TSESLint.FlatConfig.Config;

export default Object.assign(cnPlugin, { configs: { recommended } });
