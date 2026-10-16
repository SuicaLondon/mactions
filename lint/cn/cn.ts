import type { TSESLint } from '@typescript-eslint/utils';

import classComposition from './class-composition.ts';
import noArbitraryValues from './no-arbitrary-values.ts';
import tailwindConventions from './tailwind-conventions.ts';

const cnPlugin = {
  meta: { name: 'mactions-cn-conventions' },
  rules: {
    'class-composition': classComposition,
    'no-arbitrary-values': noArbitraryValues,
    'tailwind-conventions': tailwindConventions,
  },
} satisfies TSESLint.FlatConfig.Plugin;

const recommended = {
  plugins: { cn: cnPlugin },
  rules: {
    'cn/class-composition': 'error',
    'cn/no-arbitrary-values': 'error',
    'cn/tailwind-conventions': 'error',
  },
} satisfies TSESLint.FlatConfig.Config;

export default Object.assign(cnPlugin, { configs: { recommended } });
