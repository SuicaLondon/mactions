import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';

import type { InvalidTestCase } from '@typescript-eslint/rule-tester';
import { ESLint } from 'eslint';

import { ruleTester } from '../rule-tester.ts';
import rule, { arbitraryClasses, type ArbitraryKind } from './no-arbitrary-values.ts';

type InvalidCase = InvalidTestCase<ArbitraryKind | 'spacing' | 'replace', []>;

function classString(className: string) {
  return `<div className=${JSON.stringify(className)} />;`;
}

function replaced(className: string, replacement: string): InvalidCase {
  const data = { className, replacement };
  return {
    code: classString(className),
    errors: [
      {
        messageId: 'spacing',
        data,
        suggestions: [{ messageId: 'replace', data, output: classString(replacement) }],
      },
    ],
  };
}

function rejected(code: string, messageId: ArbitraryKind): InvalidCase {
  return { code, errors: [{ messageId }] };
}

ruleTester({ languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } }).run(
  'no-arbitrary-values',
  rule,
  {
    valid: [
      classString('h-7.25 gap-1.5 max-md:px-4 @max-5xl:hidden @max-xl/activity-main:flex-1'),
      classString('grid-cols-runners max-md:grid-cols-leading w-1/2 bg-accent/8 min-h-7.5!'),
      classString(
        'group-hover/item:text-accent aria-expanded:rotate-90 before:content-line-number',
      ),
      'cn("-outline-offset-3", { "data-active:bg-amber-300": active });',
      // Outside class strings, selectors, log text, paths, and patterns are ordinary data.
      'const selector = "[data-row-focus]:not([hidden])";',
      'const message = "[INFO:main] Runner started at [12:30]";',
      'const route = "src/(group)/page";',
      'const pattern = "^job-(\\\\d+)$";',
      'const pattern = /h-\\[2px\\]/;',
    ],
    invalid: [
      replaced('h-[20px]', 'h-5'),
      replaced('p-[2px]', 'p-0.5'),
      replaced('h-[29px]', 'h-7.25'),
      replaced('w-[1px]', 'w-px'),
      replaced('w-[100%]', 'w-full'),
      replaced('gap-x-[0.375rem]', 'gap-x-1.5'),
      replaced('max-md:-mt-[6px]', 'max-md:-mt-1.5'),
      replaced('top-[-4px]', '-top-1'),
      replaced('h-[1.25rem]!', 'h-5!'),
      replaced('m-[0]', 'm-0'),
      ...[
        'h-[13.5px]',
        'p-[-2px]',
        'text-[11px]',
        'bg-[#fff]',
        'rounded-[5px]',
        'w-[calc(100%_-_--spacing(8))]',
        'grid-cols-[minmax(--spacing(40),_.8fr)_1fr]',
        'grid-cols-[auto_1fr]',
        'bg-(--brand)',
        "before:content-['']",
        'after:content-[attr(data-time)]',
      ].map((className) => rejected(classString(className), 'value')),
      ...['[font-weight:550]', '[--panel:2px]', 'hover:[mask-type:luminance]'].map((className) =>
        rejected(classString(className), 'property'),
      ),
      ...[
        '[&_svg]:size-3',
        '[.selected_&]:font-medium',
        '[@media_(max-width:_730px)]:hidden',
        'max-[45rem]:hidden',
        'min-[45rem]:hidden',
        '@max-[36rem]/activity-main:flex-1',
        'group-[.selected]:text-accent',
        'data-[state=open]:block',
        'supports-[display:grid]:grid',
        'has-[:checked]:bg-accent',
      ].map((className) => rejected(classString(className), 'variant')),
      ...['bg-accent/[0.3]', 'text-sm/[18px]', 'bg-surface/(--alpha)'].map((className) =>
        rejected(classString(className), 'modifier'),
      ),
      // Class composition: cn() arguments, condition keys, class maps, and template literals.
      rejected('cn("flex", "grid-cols-[auto_1fr]");', 'value'),
      rejected('cn({ "max-[45rem]:hidden": compact });', 'variant'),
      rejected('const toneClasses = { done: "text-[#116329]" };', 'value'),
      rejected('cn(`h-[${height}px]`);', 'value'),
      // Strings outside class contexts still report shapes that only Tailwind uses.
      rejected('function compactClass() { return "max-[45rem]:hidden"; }', 'variant'),
      rejected('const selector = "[&_svg]:size-3";', 'variant'),
      {
        code: 'const size = "h-[20px]";',
        errors: [
          {
            messageId: 'spacing',
            suggestions: [{ messageId: 'replace', output: 'const size = "h-5";' }],
          },
        ],
      },
      // Each class is reported at its own position; suggestions replace only that class.
      {
        code: classString('flex p-[2px] [&_svg]:size-3 text-[11px]'),
        errors: [
          {
            messageId: 'spacing',
            column: 22,
            endColumn: 29,
            suggestions: [
              {
                messageId: 'replace',
                output: classString('flex p-0.5 [&_svg]:size-3 text-[11px]'),
              },
            ],
          },
          { messageId: 'variant', column: 30, endColumn: 44 },
          { messageId: 'value', column: 45, endColumn: 56 },
        ],
      },
    ],
  },
);

void test('global styles apply no arbitrary classes', async () => {
  const directory = new URL('../../web/src/styles/', import.meta.url);
  for (const name of await readdir(directory)) {
    if (!name.endsWith('.css')) continue;
    const source = await readFile(new URL(name, directory), 'utf8');
    for (const apply of source.matchAll(/@apply\s+([^;]+);/g)) {
      assert.deepEqual(arbitraryClasses(apply[1]), [], `${name}: @apply ${apply[1]}`);
    }
  }
});

void test('the repository configuration rejects arbitrary classes in source files', async () => {
  const [result] = await new ESLint().lintText(
    'export function Example() { return <div className="h-[20px] gap-2" />; }',
    { filePath: 'web/src/shared/lib/no-arbitrary-values.test.tsx' },
  );
  const messages = result.messages.filter((message) => message.ruleId === 'cn/no-arbitrary-values');
  assert.equal(messages.length, 1, JSON.stringify(result.messages));
  assert.equal(messages[0].severity, 2);
  assert.match(messages[0].message, /Use "h-5" instead/);
});
