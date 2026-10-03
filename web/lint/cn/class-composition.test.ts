import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TSESLint } from '@typescript-eslint/utils';
import { RuleTester } from 'eslint';
import { format } from 'prettier';

import config from '../../prettier.config.mjs';
import rule from './class-composition.ts';

RuleTester.setDefaultConfig({
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
});

new TSESLint.RuleTester().run('class-composition', rule, {
  valid: [
    '<div className={cn("flex gap-2", { "ring-2 ring-focus": selected }, className)} />;',
    '<div className={cn(variants[tone], jobResultClasses[tone])} />;',
    `const className = cn('${'max-md:'.repeat(15)}hidden');`,
    'const title = "This long test description explains a state transition and is not a CSS class group.";',
    'cn({ "ring-2": offset + 1 > 0, "hidden": state === "This long predicate string is ordinary data and should not be interpreted as a class group." });',
    'cn({ "ring-2": selected ? true : false });',
    'cn([{ "ring-2": selected ? true : false }]);',
    'const buttonClasses = { primary: "bg-accent text-white", secondary: "bg-surface" };',
    'const variants = { primary: "bg-accent text-white" };',
    'const conditionalClasses = { hidden: selected ? true : false, block: selected && ready, "ring-2": number + 1 }; cn(conditionalClasses);',
    'const buttonVariants = { primary: { style: { transform: `translateX(${offset}px)` }, className: "h-8" } }; <div {...buttonVariants.primary} />;',
    `const buttonVariants = { primary: { label: '${'This is a long data label, '.repeat(5)}', message: \`Result \${result}\`, className: 'h-8' } };`,
    `const variants = { '${'This is a long data label, '.repeat(5)}': 'h-8' };`,
    'function clsx(value) { return value; } <div className={clsx(data)} />;',
    '<div className={getVariantClasses(tone)} />;',
    'function cn(value) { return value; } cn("This long sentence is ordinary function input and must not be interpreted as a class group.");',
    `cn('${'x'.repeat(38)} ${'y'.repeat(41)}');`,
  ],
  invalid: [
    {
      code: '<div className={selected ? "ring-2" : "ring-0"} />;',
      errors: [{ messageId: 'composition' }],
    },
    {
      code: '<div className={cn(`flex ${className}`)} />;',
      errors: [{ messageId: 'composition' }],
    },
    { code: '<div className={cn(`bg-${color}`)} />;', errors: [{ messageId: 'composition' }] },
    { code: 'cn(`h-[${height}px]`);', errors: [{ messageId: 'composition' }] },
    { code: 'cn(`items-${alignment}`);', errors: [{ messageId: 'composition' }] },
    { code: 'cn(`${base}${className}`);', errors: [{ messageId: 'composition' }] },
    { code: '<div className={selected && "hidden"} />;', errors: [{ messageId: 'composition' }] },
    { code: '<div className={"flex " + className} />;', errors: [{ messageId: 'composition' }] },
    {
      code: '<div className={clsx("flex", selected && "hidden")} />;',
      errors: [{ messageId: 'composition' }],
    },
    {
      code: 'import combine from "classnames"; <div className={combine("flex")} />;',
      errors: [{ messageId: 'composition' }],
    },
    {
      code: '<div className={["flex", selected && "hidden"].filter(Boolean).join(" ")} />;',
      errors: [{ messageId: 'composition' }],
    },
    {
      code: 'class Builder { #join() { return "flex"; } view() { const className = this.#join(); } }',
      errors: [{ messageId: 'composition' }],
    },
    {
      code: 'const buttonClasses = { primary: `bg-${color}` };',
      errors: [{ messageId: 'composition' }],
    },
    {
      code: 'const buttonVariants = { primary: { label: "Primary", className: `bg-${color}` } };',
      errors: [{ messageId: 'composition' }],
    },
    {
      code: 'const variants = { primary: selected ? "bg-accent" : "bg-surface" };',
      errors: [{ messageId: 'composition' }],
    },
    {
      code: `const buttonClasses = { primary: '${'flex gap-2 '.repeat(10)}' };`,
      errors: [{ messageId: 'length' }],
    },
    {
      code: 'const buttonClasses = { primary: `flex\ngap-2` };',
      errors: [{ messageId: 'newline' }],
    },
    {
      code: `<div className="${'flex gap-2 '.repeat(10)}" />;`,
      errors: [{ messageId: 'length' }],
    },
    {
      code: `const badgeClasses = ['${'flex gap-2 '.repeat(10)}'];`,
      errors: [{ messageId: 'length' }],
    },
    {
      code: `cn('${'x'.repeat(38)} ${'y'.repeat(42)}');`,
      output: `cn("${'x'.repeat(38)}",\n"${'y'.repeat(42)}");`,
      errors: [{ messageId: 'length' }],
    },
    {
      code: `cn({ '${'x'.repeat(38)} ${'y'.repeat(42)}': selected });`,
      errors: [{ messageId: 'length' }],
    },
    {
      code: `const conditionalClasses = { '${'x'.repeat(38)} ${'y'.repeat(42)}': selected }; cn(conditionalClasses);`,
      errors: [{ messageId: 'length' }],
    },
    {
      code: `cn({ [\`${'x'.repeat(38)} ${'y'.repeat(42)}\`]: selected });`,
      errors: [{ messageId: 'length' }],
    },
    {
      code: 'cn(`flex\ngap-2`);',
      output: 'cn("flex",\n"gap-2");',
      errors: [{ messageId: 'newline' }],
    },
  ],
});

void test('the configured formatter sorts cn strings and condition-object keys', async () => {
  const output = await format(
    'const classes = cn("text-sm p-2 flex", { "opacity-50 cursor-default": disabled });',
    { ...config, parser: 'typescript' },
  );
  assert.ok(output.includes("'flex p-2 text-sm'"), output);
  assert.ok(output.includes("'cursor-default opacity-50'"), output);
});
