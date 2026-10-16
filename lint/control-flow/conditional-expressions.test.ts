import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ESLint } from 'eslint';

const eslint = new ESLint();
const testFile = 'web/src/app/components/App.test.tsx';

async function ternaryLines(source: string, filePath = testFile) {
  const [result] = await eslint.lintText(source, { filePath });
  assert.ok(!result.messages.some((message) => message.fatal || message.ruleId === null));
  const messages = result.messages.filter((message) => message.ruleId === 'no-ternary');
  assert.ok(messages.every((message) => message.severity === 2));
  return messages.map((message) => message.line);
}

void test('every linted file group rejects ternaries and accepts explicit branches', async () => {
  for (const filePath of [
    'web/src/shared/lib/activity-format.ts',
    testFile,
    'lint/control-flow/conditional-expressions.test.ts',
    'web/vite.config.ts',
    'scripts/shared/paths.ts',
  ]) {
    const ternary = 'export function choose(first) { return first ? 1 : 2; }';
    assert.deepEqual(await ternaryLines(ternary, filePath), [1], filePath);
    const branches = `export function choose(first, second) {
      switch (first?.kind) { case 'special': return 3; }
      if (first) { return first.value ?? second; } else { return second; }
    }`;
    assert.deepEqual(await ternaryLines(branches, filePath), [], filePath);
  }
});

void test('nested ternaries report each conditional', async () => {
  const source = 'export function choose(first, second) { return first ? 1 : second ? 2 : 3; }';
  assert.equal((await ternaryLines(source)).length, 2);
});

void test('JSX ternaries are rejected in favor of early returns and &&', async () => {
  for (const code of [
    'return ready ? [1].map(value => <span key={value} />) : null;',
    'return ready ? <section /> : <aside />;',
    'return ready ? null : <section />;',
    'return ready ? <>Ready</> : null;',
    'return <section title={ready ? <span /> : null} />;',
    "return <section>{ready ? 'Ready' : 'Waiting'}</section>;",
  ]) {
    const source = `export function Example({ ready }) { ${code} }`;
    assert.equal((await ternaryLines(source)).length, 1, code);
  }
  for (const code of [
    'if (ready) return <section />; return <aside />;',
    'return <section>{Boolean(ready) && <span />}</section>;',
  ]) {
    const source = `export function Example({ ready }) { ${code} }`;
    assert.deepEqual(await ternaryLines(source), [], code);
  }
});

void test('a documented exception applies only to the next line', async () => {
  const source = `export function choose(first) {
    // eslint-disable-next-line no-ternary -- The external expression API requires this form.
    const value = first ? 1 : 2;
    return value ? 3 : 4;
  }`;
  assert.deepEqual(await ternaryLines(source), [4]);
});
