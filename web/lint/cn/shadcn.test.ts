import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ESLint } from 'eslint';

const eslint = new ESLint();

async function lintClasses(classes: string) {
  const [result] = await eslint.lintText(
    `export function Example() { return <div className=${JSON.stringify(classes)} />; }`,
    { filePath: 'src/shared/ui/controls/buttons/IconButton.tsx' },
  );
  return result.messages;
}

void test('shared UI lint accepts theme utilities and explicit semantic hooks', async () => {
  assert.deepEqual(await lintClasses('icon-button size-4 rounded-md text-xs text-muted'), []);
});

void test('shared UI lint rejects misspelled utilities and variants', async () => {
  const messages = await lintClasses('rounded-huge hovr:flex');
  assert.equal(messages.length, 2);
  assert.ok(messages.every((message) => message.ruleId === 'shadcn/no-unknown-classes'));
  assert.ok(messages.some((message) => message.message.includes('rounded-huge')));
  assert.ok(messages.some((message) => message.message.includes('hovr:flex')));
});
