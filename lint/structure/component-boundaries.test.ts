import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ESLint } from 'eslint';

import { ruleTester } from '../rule-tester.ts';
import rule from './component-boundaries.ts';

type MessageId = 'location' | 'multiple' | 'nested';

const component = '/src/features/example/components/View.tsx';
const hook = '/src/features/example/hooks/use-data.ts';
const store = '/src/features/example/stores/example-store.ts';
const outsideComponents = '/src/features/example/View.tsx';

const valid: [string, string][] = [
  [component, 'export function View() { return <div />; }'],
  [component, 'export const View = memo(function View() { return null; });'],
  [
    component,
    'interface ViewProps { value: string } export function View(props: ViewProps) { return <p>{props.value}</p>; }',
  ],
  [component, 'export default function View() { return <div />; }'],
  [component, 'function View() { return <div />; } export default View;'],
  [hook, 'export function useData() { return useState(0); }'],
  [
    store,
    'export const useExampleStore = create<ExampleStore>()((set) => ({ open: () => set({}) }));',
  ],
  ['/src/shared/ui/icons/status/CheckIcon.tsx', 'export function CheckIcon() { return <svg />; }'],
  ['/src/features/example/models/data.ts', 'function parseData() { return 1; }'],
];

const invalid: [string, string, ...MessageId[]][] = [
  [
    '/src/features/example/hooks/use-example-store.ts',
    'export const useExampleStore = create<ExampleStore>()(() => ({}));',
    'location',
  ],
  [
    store,
    'export const useFirstStore = create(() => ({})); export const useSecondStore = create(() => ({}));',
    'multiple',
  ],
  [
    component,
    'function Row() { return <li />; } export function View() { return <ul><Row /></ul>; }',
    'multiple',
  ],
  [component, 'export default () => <div />; export function Other() { return null; }', 'multiple'],
  [
    component,
    'export default function View() { return null; } export function Other() { return null; }',
    'multiple',
  ],
  [
    component,
    'function View() { return null; } export default View; export function Other() { return null; }',
    'multiple',
  ],
  [
    component,
    'export const View = React.lazy(() => import("./View")); export const Other = lazy(() => import("./Other"));',
    'multiple',
  ],
  [
    component,
    'function View() { return null; } function Other() { return null; } export { View, Other };',
    'multiple',
  ],
  [
    component,
    'export const View = forwardRef(() => null); export const Other = memo(() => null);',
    'multiple',
  ],
  [hook, 'function useData() {} const useOther = () => 1;', 'multiple'],
  [
    component,
    'function useData() {} export function View() { return null; }',
    'location',
    'multiple',
  ],
  [outsideComponents, 'export default function () { return <div />; }', 'location'],
  ['/src/shared/api/use-data.ts', 'function useData() {}', 'location'],
  [component, 'function View() { function Child() { return null; } return <Child />; }', 'nested'],
];

ruleTester({ languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } }).run(
  'component-boundaries',
  rule,
  {
    valid: valid.map(([filename, code]) => ({ filename, code })),
    invalid: invalid.map(([filename, code, ...messageIds]) => ({
      filename,
      code,
      errors: messageIds.map((messageId) => ({ messageId })),
    })),
  },
);

void test('the repository configuration enforces component boundaries', async () => {
  const [result] = await new ESLint().lintText(
    'export function useFirst() {} export function useSecond() {}',
    { filePath: 'web/src/shared/hooks/use-query-visible.ts' },
  );
  const messages = result.messages.filter(
    (message) => message.ruleId === 'structure/component-boundaries',
  );
  assert.deepEqual(
    messages.map((message) => message.severity),
    [2],
    JSON.stringify(result.messages),
  );
});
