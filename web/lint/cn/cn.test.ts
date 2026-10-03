import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TSESLint } from '@typescript-eslint/utils';
import { cn } from 'cn';
import { ESLint } from 'eslint';
import { format } from 'prettier';
import tseslint from 'typescript-eslint';

import prettierConfig from '../../prettier.config.mjs';
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
    {
      files: ['**/*.{ts,tsx}'],
      languageOptions: { parser: tseslint.parser },
      rules,
    },
  ];
}

function verify(source: string, maxLength?: number) {
  return linter.verify(source, config(maxLength), { filename });
}

function fix(source: string, maxLength?: number) {
  return linter.verifyAndFix(source, config(maxLength), { filename });
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

void test('the recommended flat config registers both cn rules as errors', () => {
  assert.equal(plugin.configs.recommended.plugins.cn, plugin);
  assert.equal(plugin.configs.recommended.rules['cn/class-composition'], 'error');
  assert.equal(plugin.configs.recommended.rules['cn/tailwind-conventions'], 'error');
  const messages = verify(`${importCn}const classes = cn('${longClasses}', 'h-[32px]');`);
  assert.deepEqual(
    new Set(messages.map((message) => message.ruleId)),
    new Set(['cn/class-composition', 'cn/tailwind-conventions']),
  );
  assert.ok(
    messages.every((message) => message.severity === 2),
    JSON.stringify(messages),
  );
});

void test('the repository ESLint configuration enables both cn rules', async () => {
  const [result] = await new ESLint().lintText(
    `${importCn}const classes = cn('${longClasses}', 'h-[32px]');`,
    { filePath: 'src/shared/lib/cn.test.ts' },
  );
  const messages = result.messages.filter((message) => message.ruleId?.startsWith('cn/'));
  assert.deepEqual(
    new Set(messages.map((message) => message.ruleId)),
    new Set(['cn/class-composition', 'cn/tailwind-conventions']),
  );
  assert.ok(messages.every((message) => message.severity === 2));
});

void test('the integrated Tailwind rule rejects arbitrary spacing, raw media, and selectors', () => {
  for (const classes of [
    'h-[32px]',
    'gap-[6px]',
    'h-[calc(100%_-_--spacing(7.25))]',
    'max-md:basis-[calc(100%_-_--spacing(10))]',
    'grid-cols-[calc(100%_-_--spacing(8))_1fr]',
    'z-[calc(var(--layer)_+_1)]',
    '@media (max-width: 730px)',
    '[@media_(max-width:_730px)]:hidden',
    '[.job-step-toggle_&]:font-medium',
    '[&_svg]:size-3.5',
  ]) {
    const messages = verify(`${importCn}const classes = cn(${JSON.stringify(classes)});`);
    assert.equal(messages.length, 1, JSON.stringify(messages));
    assert.equal(messages[0].ruleId, 'cn/tailwind-conventions', classes);
    assert.equal(messages[0].messageId, 'convention', classes);
  }
});

void test('the integrated rules accept standard spacing and named responsive variants', () => {
  for (const classes of [
    'h-8 gap-1.5 md:flex max-md:hidden',
    '@container/panel @max-xl/panel:flex-col',
    'flex-1 min-h-0 w-full grid-cols-[--spacing(8)_1fr]',
    'hover:bg-canvas aria-expanded:rotate-90 group-hover/item:text-accent',
  ]) {
    assert.deepEqual(
      verify(`${importCn}const classes = cn(${JSON.stringify(classes)});`),
      [],
      classes,
    );
  }
});

void test('long direct cn arguments autofix without changing runtime merging or formatter stability', async () => {
  const source = `${importCn}const classes = cn('${longClasses}', { 'bg-accent border-accent px-2 text-white': selected }, className);`;
  const result = fix(source);
  assert.equal(result.fixed, true, JSON.stringify(result.messages));
  assert.deepEqual(result.messages, []);
  assert.deepEqual(verify(result.output), []);
  assert.equal(fix(result.output).fixed, false);

  const formatted = await format(result.output, { ...prettierConfig, parser: 'typescript' });
  const secondPass = fix(formatted);
  assert.deepEqual(secondPass.messages, []);
  assert.equal(secondPass.fixed, false);
  assert.equal(secondPass.output, formatted);
  assert.equal(await format(formatted, { ...prettierConfig, parser: 'typescript' }), formatted);

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
  const withExternalOverride = evaluateClasses(formatted, true, 'bg-canvas px-6 text-lg');
  assert.ok(withExternalOverride.includes('bg-canvas'));
  assert.ok(withExternalOverride.includes('px-6'));
  assert.ok(withExternalOverride.includes('text-lg'));
  assert.ok(!withExternalOverride.includes('bg-accent'));
  assert.ok(!withExternalOverride.includes('px-2'));
});

void test('imported cn aliases safely split direct arguments', async () => {
  const header = "import { cn as compose } from '@/shared/lib/cn';\n";
  const source = `${header}const view = <div className={compose('${longClasses}')} />;`;
  const result = fix(source);
  assert.equal(result.fixed, true, JSON.stringify(result.messages));
  assert.deepEqual(result.messages, []);
  assert.match(result.output, /className=\{compose\(/);
  assert.deepEqual(verify(result.output), []);
  const formatted = await format(result.output, {
    ...prettierConfig,
    tailwindFunctions: [...prettierConfig.tailwindFunctions, 'compose'],
    parser: 'typescript',
  });
  assert.equal(fix(formatted).fixed, false);
});

void test('parenthesized arguments are reported without introducing sequence expressions', () => {
  for (const value of [JSON.stringify(longClasses), `\`${longClasses}\``]) {
    for (const expression of [`(${value})`, `(/* keep comment */ (${value}))`]) {
      const source = `${importCn}const classes = cn(${expression}, 'px-6');`;
      const result = fix(source);
      assert.equal(result.fixed, false);
      assert.equal(result.output, source);
      assert.equal(result.messages.length, 1);
      assert.equal(result.messages[0].messageId, 'length');
      assert.equal(evaluateClasses(result.output, false, ''), evaluateClasses(source, false, ''));
    }
  }
});

void test('JSX attributes remain manual fixes because adding cn can change conflicting utilities', () => {
  for (const value of [`"p-4 ${longClasses} p-2"`, `{\`p-4 ${longClasses} p-2\`}`]) {
    const source = `${importCn}const view = <div className=${value} />;`;
    const result = fix(source);
    assert.equal(result.fixed, false);
    assert.equal(result.output, source);
    assert.equal(result.messages.length, 1);
    assert.equal(result.messages[0].messageId, 'length');
  }
});

void test('static class templates autofix while interpolated class templates remain rejected', () => {
  const staticSource = `${importCn}const classes = cn(\`${longClasses}\`);`;
  const result = fix(staticSource);
  assert.equal(result.fixed, true, JSON.stringify(result.messages));
  assert.deepEqual(result.messages, []);
  assert.equal(evaluateClasses(result.output, false, ''), evaluateClasses(staticSource, false, ''));

  const interpolatedSource = `${importCn}const classes = cn(\`flex \${className}\`);`;
  const interpolated = fix(interpolatedSource);
  assert.equal(interpolated.fixed, false);
  assert.equal(interpolated.output, interpolatedSource);
  assert.equal(interpolated.messages.length, 1);
  assert.equal(interpolated.messages[0].ruleId, 'cn/class-composition');
  assert.equal(interpolated.messages[0].messageId, 'composition');
});

void test('maxLength is configurable without splitting an indivisible utility', () => {
  const source = `${importCn}const classes = cn('flex items-center gap-1.5 rounded-md px-4 text-sm');`;
  assert.deepEqual(verify(source), []);
  assert.equal(verify(source, 40)[0].messageId, 'length');
  const result = fix(source, 40);
  assert.equal(result.fixed, true);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(verify(result.output, 40), []);
  assert.equal(evaluateClasses(result.output, false, ''), evaluateClasses(source, false, ''));

  const indivisible = `${'max-md:'.repeat(15)}hidden`;
  const indivisibleSource = `${importCn}const classes = cn('${indivisible}');`;
  assert.deepEqual(verify(indivisibleSource, 40), []);
  assert.equal(fix(indivisibleSource, 40).fixed, false);
});

void test('short cn groups keep their existing shape and condition order', () => {
  const source = `${importCn}const classes = cn('flex gap-2', { 'opacity-50': disabled }, className);`;
  assert.deepEqual(verify(source), []);
  const result = fix(source);
  assert.equal(result.fixed, false);
  assert.equal(result.output, source);
});

void test('condition-object references stay predicates through arrays and TypeScript wrappers', () => {
  for (const expression of [
    '[conditionalClasses]',
    '[[conditionalClasses]]',
    '...[conditionalClasses]',
    'conditionalClasses as Record<string, boolean>',
    'conditionalClasses satisfies Record<string, boolean>',
    'conditionalClasses!',
    '[conditionalClasses as Record<string, boolean>]',
  ]) {
    const source = `${importCn}const conditionalClasses = { hidden: selected && ready }; cn(${expression});`;
    assert.deepEqual(verify(source), [], expression);
  }
});
