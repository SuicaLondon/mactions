import path from 'node:path';

import js from '@eslint/js';
import type { TSESLint } from '@typescript-eslint/utils';
import prettier from 'eslint-config-prettier/flat';
import tailwind from 'eslint-plugin-better-tailwindcss';
import { getDefaultSelectors } from 'eslint-plugin-better-tailwindcss/defaults';
import { MatcherType, SelectorKind } from 'eslint-plugin-better-tailwindcss/types';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactX from 'eslint-plugin-react-x';
import importSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

import cnConventions from './lint/cn/cn.ts';
import controlFlow from './lint/control-flow/control-flow.ts';
import dateConventions from './lint/date/date-conventions.ts';
import structure from './lint/structure/plugin.ts';

const conditionalConfig = {
  plugins: controlFlow.configs.recommended.plugins,
  rules: { 'no-ternary': 'error', ...controlFlow.configs.recommended.rules },
} satisfies TSESLint.FlatConfig.Config;

// Scripts and configuration are TypeScript; JavaScript sources are rejected wherever ESLint runs.
const typescriptOnlyConfig = {
  files: ['**/*.{js,mjs,cjs,jsx}'],
  plugins: { structure },
  rules: { 'structure/typescript-only': 'error' },
} satisfies TSESLint.FlatConfig.Config;

const contextRestriction = {
  name: 'react',
  importNames: ['createContext', 'useContext'],
  message: 'Share client state through a Zustand store in a stores/ directory.',
};

const configImportRules = {
  'simple-import-sort/imports': 'error',
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
  ],
} satisfies TSESLint.FlatConfig.Rules;

// The only ESLint configuration. File patterns are relative to the repository root.
export default tseslint.config(
  // ESLint does not read .gitignore; agent worktrees are full checkouts with their own builds.
  { ignores: ['dist/**', 'target/**', 'web/dist/**', 'web/coverage/**', '.claude/worktrees/**'] },
  {
    files: ['scripts/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    plugins: { 'simple-import-sort': importSort },
    rules: configImportRules,
  },
  conditionalConfig,
  typescriptOnlyConfig,
  {
    files: ['lint/**/*.ts', 'eslint.config.ts', 'prettier.config.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    plugins: { 'simple-import-sort': importSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  {
    files: ['web/src/**/*.{ts,tsx}', 'web/vite.config.ts', 'web/vitest.config.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactX.configs['recommended-typescript'],
    ],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: {
      'react-hooks': reactHooks,
      'simple-import-sort': importSort,
      'react-refresh': reactRefresh,
      ...cnConventions.configs.recommended.plugins,
    },
    rules: {
      ...dateConventions,
      ...cnConventions.configs.recommended.rules,
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      eqeqeq: ['error', 'smart'],
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        { ignorePrimitives: { string: true }, ignoreMixedLogicalExpressions: true },
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [contextRestriction],
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ['web/src/**/*.tsx'],
    ignores: ['web/src/**/*.test.tsx'],
    extends: [tailwind.configs['recommended-error']],
    settings: {
      'better-tailwindcss': {
        entryPoint: path.join(import.meta.dirname, 'web/src/styles/index.css'),
        // Class maps such as `toneClasses` and `runCellClasses` hold utilities too.
        selectors: [
          ...getDefaultSelectors(),
          {
            kind: SelectorKind.Variable,
            name: '^.*Classes?$',
            match: [{ type: MatcherType.String }, { type: MatcherType.ObjectValue }],
          },
        ],
      },
    },
    rules: {
      // cn/class-composition owns class group splitting and Prettier owns class order.
      'better-tailwindcss/enforce-consistent-line-wrapping': 'off',
      'better-tailwindcss/enforce-consistent-class-order': 'off',
    },
  },
  {
    files: ['web/src/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@tanstack/react-query',
              importNames: [
                'useQuery',
                'useInfiniteQuery',
                'useQueries',
                'useMutation',
                'useQueryClient',
                'useIsFetching',
                'useIsMutating',
                'useMutationState',
                'useSuspenseQuery',
                'useSuspenseInfiniteQuery',
                'useSuspenseQueries',
                'usePrefetchQuery',
                'usePrefetchInfiniteQuery',
              ],
              message: 'Keep query subscriptions and cache operations in feature hooks.',
            },
            contextRestriction,
          ],
        },
      ],
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true, allowExportNames: ['matchesStatus'] },
      ],
    },
  },
  {
    files: ['web/src/**/*.{ts,tsx}'],
    ignores: ['web/src/**/*.test.{ts,tsx}', 'web/src/test/**'],
    plugins: { structure },
    rules: { 'structure/component-boundaries': 'error' },
  },
  {
    files: ['web/src/**/*.test.{ts,tsx}', 'web/src/test/**'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: { '@typescript-eslint/no-empty-function': 'off' },
  },
  prettier,
);
