import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ESLint } from 'eslint';

const eslint = new ESLint();

async function lint(source: string) {
  const [result] = await eslint.lintText(source, {
    filePath: 'web/src/shared/ui/controls/buttons/IconButton.tsx',
  });
  return result.messages
    .map((message) => message.ruleId ?? '')
    .filter((rule) => rule.startsWith('better-tailwindcss/'));
}

void test('Tailwind lint accepts theme utilities, registered utilities, and class maps', async () => {
  const source = `export const toneClasses = { done: 'text-activity-success' };
export function Example() { return <div className="button-primary size-4 text-muted" />; }`;
  assert.deepEqual(await lint(source), []);
});

void test('Tailwind lint rejects unknown, conflicting, and non-canonical classes', async () => {
  const rules = await lint(`export const stateClasses = { done: 'rounded-huge' };
export function Example() { return <div className="hovr:flex px-3 px-4 text-xs leading-normal" />; }`);
  assert.ok(rules.includes('better-tailwindcss/no-unknown-classes'));
  assert.ok(rules.includes('better-tailwindcss/no-conflicting-classes'));
  assert.ok(rules.includes('better-tailwindcss/enforce-canonical-classes'));
  assert.equal(rules.filter((rule) => rule === 'better-tailwindcss/no-unknown-classes').length, 2);
});
