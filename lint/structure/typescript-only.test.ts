import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ESLint } from 'eslint';

const eslint = new ESLint();

void test('lint rejects JavaScript sources and accepts TypeScript sources', async () => {
  for (const [filePath, expected] of [
    ['web/tool.config.mjs', [2]],
    ['web/src/legacy.js', [2]],
    ['scripts/tool.mjs', [2]],
    ['tool.config.cjs', [2]],
    ['eslint.config.ts', []],
    ['scripts/dev.ts', []],
  ] as const) {
    const [result] = await eslint.lintText('globalThis.value = 1;\n', { filePath });
    const severities = result.messages
      .filter((message) => message.ruleId === 'structure/typescript-only')
      .map((message) => message.severity);
    assert.deepEqual(severities, expected, `${filePath}: ${JSON.stringify(result.messages)}`);
  }
});
