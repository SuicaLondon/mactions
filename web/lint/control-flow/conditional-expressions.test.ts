import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ESLint } from 'eslint';

const eslint = new ESLint();

for (const filePath of [
  'src/shared/lib/activity-format.ts',
  'src/app/components/App.test.tsx',
  'lint/control-flow/conditional-expressions.test.ts',
  'vite.config.ts',
  'eslint.config.mjs',
  '../scripts/shared/paths.ts',
  '../eslint.config.mjs',
]) {
  void test(`lint rejects a ternary in ${filePath}`, async () => {
    const [result] = await eslint.lintText(
      'export function choose(first) { return first ? 1 : 2; }',
      { filePath },
    );
    const messages = result.messages.filter((message) => message.ruleId === 'no-ternary');
    assert.equal(messages.length, 1);
    assert.equal(messages[0].severity, 2);
    assert.ok(!result.messages.some((message) => message.fatal || message.ruleId === null));
  });

  void test(`lint accepts explicit branches in ${filePath}`, async () => {
    const [result] = await eslint.lintText(
      `export function choose(first, second) {
        switch (first?.kind) { case 'special': return 3; }
        if (first) { return first.value ?? second; } else { return second; }
      }`,
      { filePath },
    );
    assert.ok(!result.messages.some((message) => message.ruleId === 'no-ternary'));
    assert.ok(!result.messages.some((message) => message.fatal || message.ruleId === null));
  });
}

void test('lint rejects both nested ternaries', async () => {
  const [result] = await eslint.lintText(
    'export function choose(first, second) { return first ? 1 : second ? 2 : 3; }',
    { filePath: 'eslint.config.mjs' },
  );
  const messages = result.messages.filter((message) => message.ruleId === 'no-ternary');
  assert.equal(messages.length, 2);
  assert.ok(messages.every((message) => message.severity === 2));
});

for (const [label, code] of [
  ['mapped elements', 'return ready ? [1].map(value => <span key={value} />) : null;'],
  ['alternative elements', 'return ready ? <section /> : <aside />;'],
  ['optional elements', 'return ready ? <section /> : null;'],
  ['alternate-only elements', 'return ready ? null : <section />;'],
  ['fragments', 'return ready ? <>Ready</> : null;'],
  ['nested in props', 'return <section title={ready ? <span /> : null} />;'],
  ['text values', "return <section>{ready ? 'Ready' : 'Waiting'}</section>;"],
  ['attribute values', "return <section title={ready ? 'Ready' : 'Waiting'} />;"],
]) {
  void test(`lint rejects JSX ternaries: ${label}`, async () => {
    const [result] = await eslint.lintText(`export function Example({ ready }) { ${code} }`, {
      filePath: 'src/app/components/App.test.tsx',
    });
    const messages = result.messages.filter((message) => message.ruleId === 'no-ternary');
    assert.equal(messages.length, 1);
    assert.equal(messages[0].severity, 2);
  });
}

for (const [label, code] of [
  ['early returns', 'if (ready) return <section />; return <aside />;'],
  ['optional elements', 'return <section>{Boolean(ready) && <span />}</section>;'],
]) {
  void test(`lint accepts JSX ${label}`, async () => {
    const [result] = await eslint.lintText(`export function Example({ ready }) { ${code} }`, {
      filePath: 'src/app/components/App.test.tsx',
    });
    assert.ok(!result.messages.some((message) => message.ruleId === 'no-ternary'));
    assert.ok(!result.messages.some((message) => message.fatal || message.ruleId === null));
  });
}

void test('a documented exception applies only to the next line', async () => {
  const [result] = await eslint.lintText(
    `export function choose(first) {
      // eslint-disable-next-line no-ternary -- The external expression API requires this form.
      const value = first ? 1 : 2;
      return value ? 3 : 4;
    }`,
    { filePath: 'src/app/components/App.test.tsx' },
  );
  const messages = result.messages.filter((message) => message.ruleId === 'no-ternary');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].line, 4);
});
