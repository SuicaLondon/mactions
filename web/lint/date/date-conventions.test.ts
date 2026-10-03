import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';

import dateConventions from './date-conventions.ts';

const eslint = new ESLint();
const exec = promisify(execFile);
const restrictedRules = new Set(['no-restricted-properties', 'no-restricted-syntax']);

for (const filePath of ['src/shared/lib/date.ts', 'src/app/components/App.test.tsx']) {
  void test(`native date operations are rejected in ${filePath}`, async () => {
    for (const expression of [
      'Date.parse("2026-09-30T10:00:00Z")',
      'Date.now()',
      'Date.UTC(2026, 8, 30)',
      'new Date("2026-09-30T10:00:00Z")',
      'new Date(0)',
      'new Date()',
      'Date()',
      'new Date().toISOString()',
      'new Date().toLocaleString()',
      'new Date().toLocaleDateString()',
      'new Date().toLocaleTimeString()',
    ]) {
      const [result] = await eslint.lintText(`export const value = ${expression};`, { filePath });
      const messages = result.messages.filter(
        (message) => message.ruleId !== null && restrictedRules.has(message.ruleId),
      );
      assert.ok(messages.length > 0, expression);
      assert.ok(messages.every((message) => message.severity === 2));
    }
  });

  void test(`date-fns operations and clock reads are accepted in ${filePath}`, async () => {
    const [result] = await eslint.lintText(
      'import { constructNow, getTime, parseISO } from "date-fns"; export const values = [getTime(constructNow(undefined)), parseISO("2026-09-30T10:00:00Z")];',
      { filePath },
    );
    assert.ok(
      !result.messages.some(
        (message) => message.ruleId !== null && restrictedRules.has(message.ruleId),
      ),
    );
    assert.ok(!result.messages.some((message) => message.fatal || message.ruleId === null));
  });
}

void test('developer scripts follow the same date conventions', async () => {
  const cwd = fileURLToPath(new URL('../../..', import.meta.url));
  const scriptLint = new ESLint({
    cwd,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['scripts/**/*.ts'],
        languageOptions: { parser: tseslint.parser },
        plugins: { '@typescript-eslint': tseslint.plugin },
        rules: { ...dateConventions, '@typescript-eslint/no-require-imports': 'error' },
      },
    ],
  });
  const results = await scriptLint.lintFiles([path.join(cwd, 'scripts/**/*.ts')]);
  assert.ok(results.length > 0);
  for (const result of results) {
    assert.deepEqual(result.messages, [], path.relative(cwd, result.filePath));
  }
});

for (const [timeZone, locale, dateTime, time, preciseTime, shortDate] of [
  ['UTC', 'en_US.UTF-8', '9/30/2026, 3:59:59 PM', '03:59 PM', '03:59:59 PM', 'Sep 30'],
  ['Asia/Singapore', 'en_US.UTF-8', '9/30/2026, 11:59:59 PM', '11:59 PM', '11:59:59 PM', 'Sep 30'],
  [
    'America/New_York',
    'en_US.UTF-8',
    '9/30/2026, 11:59:59 AM',
    '11:59 AM',
    '11:59:59 AM',
    'Sep 30',
  ],
  ['Asia/Taipei', 'zh_TW.UTF-8', '2026/9/30 下午11:59:59', '下午11:59', '下午11:59:59', '9月30日'],
]) {
  void test(`shared date helpers preserve local display and UTC precision in ${timeZone}`, async () => {
    const dateModule = new URL('../../src/shared/lib/date.ts', import.meta.url).href;
    const code = `
      import { formatDateTime, formatShortDate, formatTime, formatUtcTimestamp, parseTimestamp } from ${JSON.stringify(dateModule)};
      const date = parseTimestamp('2026-09-30T15:59:59.423Z');
      console.log(JSON.stringify({
        dateTime: formatDateTime(date),
        shortDate: formatShortDate(date),
        time: formatTime(date),
        preciseTime: formatTime(date, true),
        utc: formatUtcTimestamp(date),
      }));
    `;
    const { stdout } = await exec(
      process.execPath,
      ['--experimental-strip-types', '--input-type=module', '--eval', code],
      { env: { ...process.env, TZ: timeZone, LANG: locale, LC_ALL: locale } },
    );
    const output: unknown = JSON.parse(stdout);
    assert.deepEqual(output, {
      dateTime,
      shortDate,
      time,
      preciseTime,
      utc: '2026-09-30T15:59:59.423Z',
    });
  });
}
