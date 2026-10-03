import { TSESLint } from '@typescript-eslint/utils';
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';

import rule from './component-boundaries.ts';

RuleTester.setDefaultConfig({
  languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
});

const tester = new TSESLint.RuleTester();

tester.run('component-boundaries', rule, {
  valid: [
    {
      filename: '/src/features/example/components/View.tsx',
      code: 'export function View() { return <div />; }',
    },
    {
      filename: '/src/features/example/hooks/use-data.ts',
      code: 'export function useData() { return useState(0); }',
    },
    {
      filename: '/src/features/example/components/View.tsx',
      code: 'export const View = memo(function View() { return null; });',
    },
    {
      filename: '/src/shared/ui/icons/status/CheckIcon.tsx',
      code: 'export function CheckIcon() { return <svg />; }',
    },
    {
      filename: '/src/features/example/models/data.ts',
      code: 'function parseData() { return 1; }',
    },
    {
      filename: '/src/features/example/components/View.tsx',
      code: 'interface ViewProps { value: string } export function View(props: ViewProps) { return <p>{props.value}</p>; }',
    },
  ],
  invalid: [
    {
      filename: '/src/features/example/components/View.tsx',
      code: 'export default () => <div />; function Other() { return null; }',
      errors: [{ messageId: 'multiple' }],
    },
    {
      filename: '/src/features/example/View.tsx',
      code: 'export default function () { return <div />; }',
      errors: [{ messageId: 'location' }],
    },
    {
      filename: '/src/features/example/components/View.tsx',
      code: 'const View = React.lazy(() => import("./View")); const Other = lazy(() => import("./Other"));',
      errors: [{ messageId: 'multiple' }],
    },
    {
      filename: '/src/features/example/components/View.tsx',
      code: 'function View() { return null; } function Other() { return null; }',
      errors: [{ messageId: 'multiple' }],
    },
    {
      filename: '/src/features/example/hooks/use-data.ts',
      code: 'function useData() {} const useOther = () => 1;',
      errors: [{ messageId: 'multiple' }],
    },
    {
      filename: '/src/features/example/components/View.tsx',
      code: 'function useData() {} function View() { return null; }',
      errors: [{ messageId: 'location' }, { messageId: 'multiple' }],
    },
    {
      filename: '/src/features/example/View.tsx',
      code: 'function View() { return null; }',
      errors: [{ messageId: 'location' }],
    },
    {
      filename: '/src/shared/api/use-data.ts',
      code: 'function useData() {}',
      errors: [{ messageId: 'location' }],
    },
    {
      filename: '/src/features/example/components/View.tsx',
      code: 'function View() { function Child() { return null; } return <Child />; }',
      errors: [{ messageId: 'nested' }],
    },
    {
      filename: '/src/features/example/components/View.tsx',
      code: 'const View = forwardRef(() => null); const Other = memo(() => null);',
      errors: [{ messageId: 'multiple' }],
    },
  ],
});
