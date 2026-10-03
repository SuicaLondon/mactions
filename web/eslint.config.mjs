import js from '@eslint/js';
import { plugin as shadcn } from '@shadcn/lint';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier/flat';
import cnConventions from './lint/cn/cn.ts';
import controlFlow from './lint/control-flow/control-flow.ts';
import dateConventions from './lint/date/date-conventions.ts';
import reactX from 'eslint-plugin-react-x';
import reactRefresh from 'eslint-plugin-react-refresh';
import importSort from 'eslint-plugin-simple-import-sort';
import structure from './lint/structure/plugin.ts';

/** @satisfies {import('@typescript-eslint/utils').TSESLint.FlatConfig.Config} */
const conditionalConfig = {
  plugins: controlFlow.configs.recommended.plugins,
  rules: { 'no-ternary': 'error', ...controlFlow.configs.recommended.rules },
};

export const scriptsConfig = tseslint.config(
  { ignores: ['node_modules/**', 'target/**', 'dist/**', 'web/**'] },
  conditionalConfig,
  { files: ['*.mjs'], extends: [js.configs.recommended] },
  {
    files: ['scripts/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { parser: tseslint.parser },
    plugins: { 'simple-import-sort': importSort },
    rules: {
      'simple-import-sort/imports': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
);

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  conditionalConfig,
  { files: ['*.mjs'], extends: [js.configs.recommended] },
  {
    files: ['lint/**/*.ts'],
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
    files: ['src/**/*.{ts,tsx}', '*.config.ts'],
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
      shadcn,
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
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ['src/shared/ui/**/*.{ts,tsx}'],
    ignores: ['src/shared/ui/**/*.test.{ts,tsx}'],
    rules: {
      'shadcn/no-unknown-classes': [
        'error',
        {
          // Semantic hooks for inspection and tests; they have no independent styles.
          allow: [
            'access-links',
            'capability-list',
            'detail-help',
            'filter-choice',
            'icon-button',
            'loading-placeholder',
            'runner-grid-heading',
            'runner-grid-row',
            'select-menu-footer',
            'select-option-content',
            'skeleton-line',
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.tsx'],
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
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    plugins: { structure },
    rules: { 'structure/component-boundaries': 'error' },
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: { '@typescript-eslint/no-empty-function': 'off' },
  },
  prettier,
);
