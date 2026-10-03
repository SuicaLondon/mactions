import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { TSESLint } from '@typescript-eslint/utils';
import { RuleTester } from 'eslint';
import { compile } from 'tailwindcss';

import rule, { violations } from './tailwind-conventions.ts';

RuleTester.setDefaultConfig({
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
});

new TSESLint.RuleTester().run('tailwind-conventions', rule, {
  valid: [
    'const classes = "h-8 gap-1.5 max-md:px-4 @container/panel @max-xl/panel:flex-col";',
    'const classes = "flex-1 min-h-0 w-full gap-1.5 max-md:hidden";',
    'const classes = "rounded-md text-xs focus-within:ring-2 focus-within:ring-focus";',
    'const classes = "size-3.5 hover:bg-canvas enabled:hover:filter-none aria-expanded:rotate-90 after:bg-line group-hover/item:text-accent";',
    '<div style={{ width: layout.width, top: position.y, "--progress": progress }} />;',
    '<span style={{ color: output.rgb }} />;',
  ],
  invalid: [
    ...[
      'h-[32px]',
      'gap-[6px]',
      'h-[2em]',
      'gap-[2vh]',
      'gap-y-[calc(8px_+_2vw)]',
      'h-[calc(100%_-_--spacing(7.25))]',
      'max-h-[calc(100dvh_-_--spacing(10))]',
      'max-md:basis-[calc(100%_-_--spacing(10))]',
      'grid-cols-[calc(100%_-_--spacing(8))_1fr]',
      'z-[calc(var(--layer)_+_1)]',
      'h-[var(--panel-height)]',
      'w-[min(100%,_--spacing(80))]',
      'flex-[0_1_auto]',
      'rounded-[5px]',
      'focus-within:shadow-[0_0_0_2px_var(--focus)]',
      '@max-[36.25rem]/activity-main:flex-1',
      'max-[45.625rem]:hidden',
      'min-[45.625rem]:hidden',
      '[font-weight:550]',
      'text-[11px]',
      'bg-[#fff]',
      'h-[100%]',
      'w-[calc(100%_-_32px)]',
      'grid-cols-[180px_1fr]',
      'max-md:p-[4px_8px]',
      '[@media_(max-width:_730px)]:hidden',
      '[@container_panel_(max-width:_500px)]:hidden',
      '@media screen and (max-width: 730px)',
      '@media (max-width: 730px)',
      '@media all and (max-width: 730px)',
      '@media(max-width: 730px)',
      '@MEDIA (max-width: 730px)',
      '@container panel (max-width: 500px)',
      '@container(max-width: 500px)',
      '@container panel style(--compact: true)',
      '[.job-step-toggle_&]:font-medium',
      '[&_svg]:h-3.25',
      'max-sm:[.job-step-toggle_&]:hidden',
      '[&amp;_>_svg]:h-2.75',
      '[&[aria-expanded="true"]_>_svg]:rotate-90',
      '[&_>_input[type="range"]]:flex-1',
      '[&:hover:not(:disabled)]:bg-canvas',
      '[&.selected]:bg-accent/10',
      'group-[.selected]:text-accent',
      '[&::after]:bg-muted',
    ].map((value): TSESLint.InvalidTestCase<'convention' | 'staticStyle', []> => ({
      code: `const classes = ${JSON.stringify(value)};`,
      errors: [{ messageId: 'convention' }],
    })),
    { code: 'const classes = `h-[32px] ${value}`;', errors: [{ messageId: 'convention' }] },
    {
      code: '<div style={{ height: 32, gap: 6, color: "#fff" }} />;',
      errors: [
        { messageId: 'staticStyle' },
        { messageId: 'staticStyle' },
        { messageId: 'staticStyle' },
      ],
    },
  ],
});

test('global styles follow the same Tailwind conventions', async () => {
  const directory = new URL('../../src/styles/', import.meta.url);
  for (const name of await readdir(directory)) {
    if (name.endsWith('.css')) {
      const source = await readFile(new URL(name, directory), 'utf8');
      assert.deepEqual(violations(source, false), [], name);
      for (const apply of source.matchAll(/@apply\s+([^;]+);/g)) {
        assert.deepEqual(violations(apply[1]), [], name);
      }
    }
  }
});

test('calculated geometry cannot be moved into static CSS declarations', () => {
  for (const source of [
    '.panel { height: calc(100% - --spacing(7.25)); }',
    '.panel { max-height: calc(100dvh - --spacing(10)); }',
  ])
    assert.ok(violations(source, false).length, source);
});

test('approved utilities compile with the installed Tailwind v4 theme', async () => {
  const source = await readFile(
    new URL('../../node_modules/tailwindcss/theme.css', import.meta.url),
    'utf8',
  );
  const theme = await readFile(new URL('../../src/styles/theme.css', import.meta.url), 'utf8');
  const compiler = await compile(`${source}\n${theme}\n@tailwind utilities;`);
  for (const candidate of [
    'h-8',
    'gap-1.5',
    'size-3.25',
    'not-last:border-b',
    'first:before:hidden',
    'flex-initial',
    'rounded-md',
    'focus-within:ring-2',
    'focus-within:ring-focus',
    '@max-xl/activity-main:flex-1',
    'max-md:hidden',
    'enabled:hover:bg-canvas',
    'aria-expanded:rotate-90',
    'group-hover/item:text-accent',
    'after:bg-line',
    'text-xs',
    'shadow-lg',
    'text-activity-success',
    'scrollbar-gutter-stable',
    'scrollbar-thin',
    'scheme-dark',
    'tab-4',
  ]) {
    const selector = '.' + candidate.replace(/[^a-zA-Z0-9_-]/g, (value) => `\\${value}`);
    assert.ok(compiler.build([candidate]).includes(selector), candidate);
  }
});
