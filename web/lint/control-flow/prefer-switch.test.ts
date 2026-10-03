import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { TSESLint } from '@typescript-eslint/utils';
import { ESLint, RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';

import plugin from './control-flow.ts';
import rule from './prefer-switch.ts';

function chain(branches: number, finalElse = false) {
  let source = '';
  for (let index = 0; index < branches; index += 1) {
    if (index > 0) source += ' else ';
    source += `if (value === ${index}) { return ${index}; }`;
  }
  if (finalElse) source += ' else { return -1; }';
  return source;
}

function select(branches: number, finalElse = false) {
  return `function select(value: number) { ${chain(branches, finalElse)} }`;
}

RuleTester.setDefaultConfig({ languageOptions: { parser: tseslint.parser } });

new TSESLint.RuleTester().run('prefer-switch', rule, {
  valid: [
    select(1),
    select(4),
    select(4, true),
    `${select(3)} function other(value: number) { ${chain(3)} }`,
    `function select(value: number) {
      if (outer) { ${chain(3)} }
      else if (second) { return 2; }
      else if (third) { return 3; }
      else if (fourth) { return 4; }
    }`,
    `function select(value: number) {
      if (outer) { return 0; } else { ${chain(4, true)} }
    }`,
    {
      code: select(5, true),
      options: [{ maxBranches: 5 }],
    },
    {
      code: select(1, true),
      options: [{ maxBranches: 1 }],
    },
    `function select(value: number) {
      switch (value) {
        case 0: return 0;
        case 1: return 1;
        case 2: return 2;
        case 3: return 3;
        case 4: return 4;
        default: return -1;
      }
    }`,
    `function select(value: number) {
      switch (true) {
        case value > 100: return 5;
        case value > 50: return 4;
        case value > 20: return 3;
        case value > 10: return 2;
        case value > 0: return 1;
        default: return 0;
      }
    }`,
  ],
  invalid: [
    { code: select(5), errors: [{ messageId: 'preferSwitch' }], output: null },
    { code: select(5, true), errors: [{ messageId: 'preferSwitch' }], output: null },
    { code: select(9, true), errors: [{ messageId: 'preferSwitch' }], output: null },
    {
      code: `function select(value: number) {
        if (outer) { ${chain(5)} }
        else if (second) { return 2; }
        else if (third) { return 3; }
        else if (fourth) { return 4; }
      }`,
      errors: [{ messageId: 'preferSwitch' }],
    },
    {
      code: `${select(5)} function other(value: number) { ${chain(5)} }`,
      errors: [{ messageId: 'preferSwitch' }, { messageId: 'preferSwitch' }],
    },
    {
      code: `function select(value: number) {
        if (outer) { ${chain(5)} }
        else if (second) { return 2; }
        else if (third) { return 3; }
        else if (fourth) { return 4; }
        else if (fifth) { return 5; }
      }`,
      errors: [{ messageId: 'preferSwitch' }, { messageId: 'preferSwitch' }],
    },
    {
      code: select(4),
      options: [{ maxBranches: 3 }],
      errors: [{ messageId: 'preferSwitch' }],
    },
    {
      code: select(2),
      options: [{ maxBranches: 1 }],
      errors: [{ messageId: 'preferSwitch' }],
    },
    {
      code: `function select(value: number) {
        if (value > 100) { return 5; }
        else if (value > 50 && ready) { return 4; }
        else if (isReady(value)) { return 3; }
        else if (!enabled) { return 2; }
        else if (value > 0) { return 1; }
      }`,
      errors: [{ messageId: 'preferSwitch' }],
      output: null,
    },
  ],
});

void test('the recommended configuration registers prefer-switch as an error', () => {
  assert.equal(plugin.configs.recommended.plugins['control-flow'], plugin);
  assert.deepEqual(plugin.configs.recommended.rules['control-flow/prefer-switch'], [
    'error',
    { maxBranches: 4 },
  ]);
  const messages = new TSESLint.Linter().verify(
    select(5),
    [
      plugin.configs.recommended,
      { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser } },
    ],
    { filename: 'test.ts' },
  );
  assert.equal(messages.length, 1, JSON.stringify(messages));
  assert.equal(messages[0].ruleId, 'control-flow/prefer-switch');
  assert.equal(messages[0].severity, 2);
});

void test('maxBranches rejects zero, negative, fractional, and nonnumeric values', () => {
  const linter = new TSESLint.Linter();
  for (const maxBranches of [0, -1, 1.5, '4', null]) {
    assert.throws(
      () =>
        linter.verify(
          select(5),
          [
            plugin.configs.recommended,
            {
              files: ['**/*.ts'],
              languageOptions: { parser: tseslint.parser },
              rules: { 'control-flow/prefer-switch': ['error', { maxBranches }] },
            },
          ],
          { filename: 'test.ts' },
        ),
      /maxBranches|must be|should be/,
    );
  }
});

void test('reports do not autofix conditions or alter their evaluation order', () => {
  const source = select(5, true);
  const result = new TSESLint.Linter().verifyAndFix(
    source,
    [
      plugin.configs.recommended,
      { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser } },
    ],
    { filename: 'test.ts' },
  );
  assert.equal(result.fixed, false);
  assert.equal(result.output, source);
  assert.equal(result.messages.length, 1);
});

void test('the repository configuration enforces the threshold across code and tooling', async () => {
  const web = new ESLint({ cwd: fileURLToPath(new URL('../..', import.meta.url)) });
  const root = new ESLint({ cwd: fileURLToPath(new URL('../../..', import.meta.url)) });
  const targets = [
    { eslint: web, filePath: 'src/shared/lib/cn.ts' },
    { eslint: web, filePath: 'src/shared/lib/cn.test.ts' },
    { eslint: web, filePath: 'lint/control-flow/prefer-switch.test.ts' },
    { eslint: web, filePath: 'eslint.config.mjs' },
    { eslint: root, filePath: 'scripts/dev.ts' },
    { eslint: root, filePath: 'eslint.config.mjs' },
  ];
  for (const { eslint, filePath } of targets) {
    const [result] = await eslint.lintText(`function select(value) { ${chain(5, true)} }`, {
      filePath,
    });
    assert.ok(result, filePath);
    assert.ok(!result.messages.some((message) => message.fatal), JSON.stringify(result.messages));
    const messages = result.messages.filter(
      (message) => message.ruleId === 'control-flow/prefer-switch',
    );
    assert.equal(messages.length, 1, `${filePath}: ${JSON.stringify(result.messages)}`);
    assert.equal(messages[0].severity, 2, filePath);

    const [validResult] = await eslint.lintText(`function select(value) { ${chain(4, true)} }`, {
      filePath,
    });
    assert.ok(validResult, filePath);
    assert.ok(
      !validResult.messages.some((message) => message.fatal),
      JSON.stringify(validResult.messages),
    );
    assert.ok(
      !validResult.messages.some((message) => message.ruleId === 'control-flow/prefer-switch'),
      `${filePath}: ${JSON.stringify(validResult.messages)}`,
    );
  }
});
