import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';

import type { InvalidTestCase } from '@typescript-eslint/rule-tester';
import { compile } from 'tailwindcss';

import { ruleTester } from '../rule-tester.ts';
import rule, { violations } from './tailwind-conventions.ts';

ruleTester({ languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } }).run(
  'tailwind-conventions',
  rule,
  {
    valid: [
      'const classes = "h-8 gap-1.5 max-md:px-4 @container/panel @max-xl/panel:flex-col";',
      'const classes = "flex-1 min-h-0 w-full gap-1.5 max-md:hidden";',
      'const classes = "rounded-md text-xs focus-within:ring-2 focus-within:ring-focus";',
      'const classes = "size-3.5 hover:bg-canvas enabled:hover:filter-none aria-expanded:rotate-90 after:bg-line group-hover/item:text-accent";',
      '<div style={{ width: layout.width, top: position.y, "--progress": progress }} />;',
      '<span style={{ color: output.rgb }} />;',
    ],
    // Arbitrary classes are covered by no-arbitrary-values.test.ts.
    invalid: [
      ...[
        '@media (max-width: 730px)',
        '@media(max-width: 730px)',
        '@MEDIA (max-width: 730px)',
        '@container panel (max-width: 500px)',
        '@container panel style(--compact: true)',
        'height: calc(100% - --spacing(7.25))',
        '--panel-height: calc(100dvh - --spacing(10))',
      ].map((value): InvalidTestCase<'convention' | 'staticStyle', []> => ({
        code: `const css = ${JSON.stringify(value)};`,
        errors: [{ messageId: 'convention' }],
      })),
      { code: 'const css = `@media ${query}`;', errors: [{ messageId: 'convention' }] },
      {
        code: '<div style={{ height: 32, gap: 6, color: "#fff" }} />;',
        errors: [
          { messageId: 'staticStyle' },
          { messageId: 'staticStyle' },
          { messageId: 'staticStyle' },
        ],
      },
    ],
  },
);

test('global styles follow the same Tailwind conventions', async () => {
  const directory = new URL('../../web/src/styles/', import.meta.url);
  for (const name of await readdir(directory)) {
    if (name.endsWith('.css')) {
      const source = await readFile(new URL(name, directory), 'utf8');
      assert.deepEqual(violations(source), [], name);
    }
  }
  // Calculated geometry cannot move into static CSS declarations either.
  assert.ok(violations('.panel { height: calc(100% - --spacing(7.25)); }').length);
});

test('approved utilities compile with the installed Tailwind v4 theme', async () => {
  const source = await readFile(
    new URL('../../node_modules/tailwindcss/theme.css', import.meta.url),
    'utf8',
  );
  const theme = await readFile(new URL('../../web/src/styles/theme.css', import.meta.url), 'utf8');
  const base = await readFile(new URL('../../web/src/styles/base.css', import.meta.url), 'utf8');
  const compiler = await compile(`${source}\n${theme}\n${base}\n@tailwind utilities;`);
  for (const candidate of [
    'h-8',
    'gap-1.5',
    // Named grid templates and generated-content utilities from src/styles/.
    'grid-cols-runners',
    '@max-5xl:grid-cols-runners-compact',
    'max-md:grid-cols-leading',
    'grid-cols-cards',
    'before:content-line-number',
    'first:before:hidden',
    'rounded-md',
    'focus-within:ring-2',
    '@max-xl/activity-main:flex-1',
    'max-md:hidden',
    'aria-expanded:rotate-90',
    'group-hover/item:text-accent',
    'text-xs',
    'text-activity-success',
    'scrollbar-gutter-stable',
    'scheme-dark',
    'tab-4',
  ]) {
    const selector = '.' + candidate.replace(/[^a-zA-Z0-9_-]/g, (value) => `\\${value}`);
    assert.ok(compiler.build([candidate]).includes(selector), candidate);
  }
});
