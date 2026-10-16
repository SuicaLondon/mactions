import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TSESLint } from '@typescript-eslint/utils';
import { cn } from 'cn';
import { ESLint } from 'eslint';
import { format } from 'prettier';
import tseslint from 'typescript-eslint';

import prettierConfig from '../../prettier.config.ts';
import plugin from './cn.ts';

const filename = 'src/test/cn-integration.tsx';
const linter = new TSESLint.Linter();
const importCn = "import { cn } from '@/shared/lib/cn';\n";
const longClasses =
  'relative flex min-w-0 items-center justify-between gap-2 rounded-md border border-line bg-surface px-4 py-2 text-sm';

function config(maxLength?: number): TSESLint.FlatConfig.Config[] {
  const rules: TSESLint.FlatConfig.Rules = {};
  if (maxLength !== undefined) rules['cn/class-composition'] = ['error', { maxLength }];
  return [
    plugin.configs.recommended,
    { files: ['**/*.{ts,tsx}'], languageOptions: { parser: tseslint.parser }, rules },
  ];
}

function verify(source: string, maxLength?: number) {
  return linter.verify(source, config(maxLength), { filename });
}

function fix(source: string, maxLength?: number) {
  return linter.verifyAndFix(source, config(maxLength), { filename });
}

function formatTs(source: string) {
  return format(source, { ...prettierConfig, parser: 'typescript' });
}

function evaluateClasses(source: string, selected: boolean, className: string) {
  assert.ok(source.startsWith(importCn), source);
  const evaluate = new Function(
    'cn',
    'selected',
    'className',
    `${source.slice(importCn.length)}\nreturn classes;`,
  );
  const classes: unknown = Reflect.apply(evaluate, undefined, [cn, selected, className]);
  assert.ok(typeof classes === 'string');
  return classes;
}

void test('the repository ESLint configuration enables every cn rule as an error', async () => {
  const [result] = await new ESLint().lintText(
    `${importCn}const classes = cn('${longClasses}', 'h-[32px]'); const query = '@media (width < 40rem)';`,
    { filePath: 'web/src/shared/lib/cn.test.ts' },
  );
  const messages = result.messages.filter((message) => message.ruleId?.startsWith('cn/'));
  assert.deepEqual(
    new Set(messages.map((message) => message.ruleId)),
    new Set(['cn/class-composition', 'cn/no-arbitrary-values', 'cn/tailwind-conventions']),
  );
  assert.ok(messages.every((message) => message.severity === 2));
});

void test('the integrated rules accept standard classes, short groups, and predicate references', () => {
  const conditional = 'const conditionalClasses = { hidden: selected && ready };';
  for (const source of [
    "cn('h-8 gap-1.5 md:flex max-md:hidden', '@container/panel @max-xl/panel:flex-col');",
    "cn('flex-1 min-h-0 w-full grid-cols-runners @max-5xl:grid-cols-runners-compact');",
    "cn('flex gap-2', { 'opacity-50': disabled }, className);",
    ...[
      '[conditionalClasses]',
      '[[conditionalClasses]]',
      '...[conditionalClasses]',
      'conditionalClasses as Record<string, boolean>',
      'conditionalClasses satisfies Record<string, boolean>',
      'conditionalClasses!',
    ].map((expression) => `${conditional} cn(${expression});`),
  ]) {
    assert.deepEqual(verify(`${importCn}${source}`), [], source);
  }
});

void test('long cn arguments autofix without changing merging or formatter stability', async () => {
  const sources = [
    `${importCn}const classes = cn('${longClasses}', { 'bg-accent border-accent px-2 text-white': selected }, className);`,
    `${importCn}const classes = cn(\`${longClasses}\`);`,
  ];
  for (const source of sources) {
    const result = fix(source);
    assert.equal(result.fixed, true, JSON.stringify(result.messages));
    assert.deepEqual(result.messages, []);

    const formatted = await formatTs(result.output);
    const secondPass = fix(formatted);
    assert.deepEqual(secondPass.messages, []);
    assert.equal(secondPass.output, formatted);
    assert.equal(await formatTs(formatted), formatted);

    for (const selected of [false, true]) {
      for (const externalClasses of ['', 'bg-canvas px-6 text-lg']) {
        const expected = evaluateClasses(source, selected, externalClasses);
        assert.equal(evaluateClasses(result.output, selected, externalClasses), expected);
        assert.deepEqual(
          new Set(evaluateClasses(formatted, selected, externalClasses).split(/\s+/)),
          new Set(expected.split(/\s+/)),
        );
      }
    }
  }
});

void test('imported cn aliases safely split direct arguments', async () => {
  const header = "import { cn as compose } from '@/shared/lib/cn';\n";
  const result = fix(`${header}const view = <div className={compose('${longClasses}')} />;`);
  assert.equal(result.fixed, true, JSON.stringify(result.messages));
  assert.deepEqual(result.messages, []);
  assert.match(result.output, /className=\{compose\(/);
  const formatted = await format(result.output, {
    ...prettierConfig,
    tailwindFunctions: [...prettierConfig.tailwindFunctions, 'compose'],
    parser: 'typescript',
  });
  assert.equal(fix(formatted).fixed, false);
});

void test('unsafe rewrites are reported without an autofix', () => {
  const value = JSON.stringify(longClasses);
  const template = `\`${longClasses}\``;
  for (const [source, messageId] of [
    // Parentheses would otherwise become sequence expressions.
    [`cn((${value}), 'px-6');`, 'length'],
    [`cn((/* keep comment */ (${template})), 'px-6');`, 'length'],
    // Adding cn to a JSX attribute could change which conflicting utility wins.
    [`<div className="p-4 ${longClasses} p-2" />;`, 'length'],
    [`<div className={\`p-4 ${longClasses} p-2\`} />;`, 'length'],
    ['cn(`flex ${className}`);', 'composition'],
  ]) {
    const result = fix(`${importCn}${source}`);
    assert.equal(result.fixed, false, source);
    assert.equal(result.output, `${importCn}${source}`);
    assert.deepEqual(
      result.messages.map((message) => message.messageId),
      [messageId],
      source,
    );
  }
});

void test('maxLength is configurable without splitting an indivisible utility', () => {
  const source = `${importCn}const classes = cn('flex items-center gap-1.5 rounded-md px-4 text-sm');`;
  assert.deepEqual(verify(source), []);
  const result = fix(source, 40);
  assert.equal(result.fixed, true);
  assert.deepEqual(verify(result.output, 40), []);
  assert.equal(evaluateClasses(result.output, false, ''), evaluateClasses(source, false, ''));

  const indivisible = `${importCn}const classes = cn('${'max-md:'.repeat(15)}hidden');`;
  assert.deepEqual(verify(indivisible, 40), []);
});
