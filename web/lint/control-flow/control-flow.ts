import type { TSESLint } from '@typescript-eslint/utils';

import preferSwitch, { maxConditionalBranches } from './prefer-switch.ts';

const controlFlow = {
  meta: { name: 'mactions-control-flow-conventions' },
  rules: { 'prefer-switch': preferSwitch },
} satisfies TSESLint.FlatConfig.Plugin;

const recommended = {
  plugins: { 'control-flow': controlFlow },
  rules: {
    'control-flow/prefer-switch': ['error', { maxBranches: maxConditionalBranches }],
  },
} satisfies TSESLint.FlatConfig.Config;

export default Object.assign(controlFlow, { configs: { recommended } });
