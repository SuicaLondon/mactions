import assert from 'node:assert/strict';
import { test } from 'node:test';

import { format } from 'prettier';

import config from '../../prettier.config.ts';
import { ruleTester } from '../rule-tester.ts';
import rule from './class-composition.ts';

const long = 'flex gap-2 '.repeat(10);
// 81 characters: one over the default limit, split between the two words.
const splittable = `${'x'.repeat(38)} ${'y'.repeat(42)}`;

ruleTester({ languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } }).run(
  'class-composition',
  rule,
  {
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
      ...[
        '<div className={selected ? "ring-2" : "ring-0"} />;',
        '<div className={cn(`flex ${className}`)} />;',
        '<div className={cn(`bg-${color}`)} />;',
        'cn(`h-[${height}px]`);',
        'cn(`items-${alignment}`);',
        'cn(`${base}${className}`);',
        '<div className={selected && "hidden"} />;',
        '<div className={"flex " + className} />;',
        '<div className={clsx("flex", selected && "hidden")} />;',
        'import combine from "classnames"; <div className={combine("flex")} />;',
        '<div className={["flex", selected && "hidden"].filter(Boolean).join(" ")} />;',
        'class Builder { #join() { return "flex"; } view() { const className = this.#join(); } }',
        'const buttonClasses = { primary: `bg-${color}` };',
        'const buttonVariants = { primary: { label: "Primary", className: `bg-${color}` } };',
        'const variants = { primary: selected ? "bg-accent" : "bg-surface" };',
      ].map((code) => ({ code, errors: [{ messageId: 'composition' as const }] })),
      ...[
        `const buttonClasses = { primary: '${long}' };`,
        `<div className="${long}" />;`,
        `const badgeClasses = ['${long}'];`,
        `cn({ '${splittable}': selected });`,
        `const conditionalClasses = { '${splittable}': selected }; cn(conditionalClasses);`,
        `cn({ [\`${splittable}\`]: selected });`,
      ].map((code) => ({ code, errors: [{ messageId: 'length' as const }] })),
      {
        code: `cn('${splittable}');`,
        output: `cn("${'x'.repeat(38)}",\n"${'y'.repeat(42)}");`,
        errors: [{ messageId: 'length' }],
      },
      {
        code: 'const buttonClasses = { primary: `flex\ngap-2` };',
        errors: [{ messageId: 'newline' }],
      },
      {
        code: 'cn(`flex\ngap-2`);',
        output: 'cn("flex",\n"gap-2");',
        errors: [{ messageId: 'newline' }],
      },
    ],
  },
);

void test('the configured formatter sorts cn strings and condition-object keys', async () => {
  const output = await format(
    'const classes = cn("text-sm p-2 flex", { "opacity-50 cursor-default": disabled });',
    { ...config, parser: 'typescript' },
  );
  assert.ok(output.includes("'flex p-2 text-sm'"), output);
  assert.ok(output.includes("'cursor-default opacity-50'"), output);
});
