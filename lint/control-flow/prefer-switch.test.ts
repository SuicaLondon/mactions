import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TSESLint } from '@typescript-eslint/utils';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';

import { ruleTester } from '../rule-tester.ts';
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

function nested(innerBranches: number, outerBranches: string[]) {
  const outer = outerBranches.map((name, index) => ` else if (${name}) { return ${index}; }`);
  return `function select(value: number) { if (outer) { ${chain(innerBranches)} }${outer.join('')} }`;
}

const preferSwitch = { messageId: 'preferSwitch' } as const;

ruleTester().run('prefer-switch', rule, {
  valid: [
    select(4),
    // A final else is not a branch.
    select(4, true),
    `${select(3)} function other(value: number) { ${chain(3)} }`,
    nested(3, ['second', 'third', 'fourth']),
    `function select(value: number) { if (outer) { return 0; } else { ${chain(4, true)} } }`,
    { code: select(5, true), options: [{ maxBranches: 5 }] },
    { code: select(1, true), options: [{ maxBranches: 1 }] },
    `function select(value: number) {
      switch (true) {
        case value > 100: return 5;
        case value > 50: return 4;
        case value > 20: return 3;
        case value > 10: return 2;
        default: return 0;
      }
    }`,
  ],
  invalid: [
    // output: null asserts that reports never autofix or reorder conditions.
    { code: select(5), errors: [preferSwitch], output: null },
    { code: select(9, true), errors: [preferSwitch], output: null },
    { code: nested(5, ['second', 'third', 'fourth']), errors: [preferSwitch] },
    {
      code: `${select(5)} function other(value: number) { ${chain(5)} }`,
      errors: [preferSwitch, preferSwitch],
    },
    {
      code: nested(5, ['second', 'third', 'fourth', 'fifth']),
      errors: [preferSwitch, preferSwitch],
    },
    { code: select(4), options: [{ maxBranches: 3 }], errors: [preferSwitch] },
    { code: select(2), options: [{ maxBranches: 1 }], errors: [preferSwitch] },
    {
      code: `function select(value: number) {
        if (value > 100) { return 5; }
        else if (value > 50 && ready) { return 4; }
        else if (isReady(value)) { return 3; }
        else if (!enabled) { return 2; }
        else if (value > 0) { return 1; }
      }`,
      errors: [preferSwitch],
      output: null,
    },
  ],
});

void test('maxBranches rejects zero, negative, fractional, and nonnumeric values', () => {
  const linter = new TSESLint.Linter();
  for (const maxBranches of [0, -1, 1.5, '4', null]) {
    const rules: TSESLint.FlatConfig.Rules = {
      'control-flow/prefer-switch': ['error', { maxBranches }],
    };
    const config = [
      plugin.configs.recommended,
      { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser }, rules },
    ];
    assert.throws(
      () => linter.verify(select(5), config, { filename: 'test.ts' }),
      /maxBranches|must be|should be/,
    );
  }
});

void test('the repository configuration enforces four branches in code and tooling', async () => {
  const eslint = new ESLint();
  for (const filePath of [
    'web/src/shared/lib/cn.ts',
    'lint/control-flow/prefer-switch.test.ts',
    'scripts/dev.ts',
  ]) {
    for (const [branches, expected] of [
      [5, 1],
      [4, 0],
    ]) {
      const [result] = await eslint.lintText(
        `function select(value) { ${chain(branches, true)} }`,
        { filePath },
      );
      assert.ok(!result.messages.some((message) => message.fatal), JSON.stringify(result.messages));
      const messages = result.messages.filter(
        (message) => message.ruleId === 'control-flow/prefer-switch' && message.severity === 2,
      );
      assert.equal(messages.length, expected, `${filePath}: ${JSON.stringify(result.messages)}`);
    }
  }
});
