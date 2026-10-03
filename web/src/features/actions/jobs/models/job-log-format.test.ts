import { expect, it } from 'vitest';

import { parseJobLogLines } from './job-log-format';

it.each([
  ['', [{ parts: [], newline: false }]],
  ['\n', [{ parts: [], newline: true }]],
  [
    'first\r\n\nlast\n',
    [
      { parts: [{ text: 'first\r', style: {} }], newline: true },
      { parts: [], newline: true },
      { parts: [{ text: 'last', style: {} }], newline: true },
    ],
  ],
])('preserves text and line endings for %j', (content, expected) => {
  expect(parseJobLogLines(content)).toEqual(expected);
});

it('carries styles across lines and preserves earlier segments when styles reset', () => {
  const lines = parseJobLogLines(
    '\u001b[1;2;4;31mstyled\n^[[22;24mcolor only^[[39m plain^[[m reset',
  );
  expect(lines).toEqual([
    {
      parts: [{ text: 'styled', style: { bold: true, dim: true, underline: true, color: 'red' } }],
      newline: true,
    },
    {
      parts: [
        {
          text: 'color only',
          style: { bold: false, dim: false, underline: false, color: 'red' },
        },
        { text: ' plain', style: { bold: false, dim: false, underline: false } },
        { text: ' reset', style: {} },
      ],
      newline: false,
    },
  ]);
});

it('consumes ignored CSI and incomplete extended colors without changing the foreground', () => {
  const lines = parseJobLogLines(
    '\u001b[31mbefore\u001b[2K erased^[[?25h cursor\u001b[48;2;1;2;3m background' +
      '\u001b[38;2;10;20m incomplete\u001b[38;5;256m invalid\u001b[3m italic',
  );
  expect(lines[0].parts.map((part) => part.text).join('')).toBe(
    'before erased cursor background incomplete invalid italic',
  );
  expect(lines[0].parts.every((part) => part.style.color === 'red')).toBe(true);
  expect(lines[0].parts.every((part) => part.style.rgb === undefined)).toBe(true);
  expect(parseJobLogLines('unfinished \u001b[38;2')).toEqual([
    { parts: [{ text: 'unfinished \u001b[38;2', style: {} }], newline: false },
  ]);
});

it('consumes extended color values and applies later codes in the same sequence', () => {
  expect(
    parseJobLogLines('\u001b[48;2;1;2;4;38;2;10;20;30;1mrgb\u001b[97mbright')[0].parts,
  ).toEqual([
    { text: 'rgb', style: { rgb: 'rgb(10, 20, 30)', bold: true } },
    { text: 'bright', style: { color: 'bright-white', bold: true } },
  ]);
});

it.each([
  [0, '#484f58'],
  [15, '#ffffff'],
  [16, 'rgb(0, 0, 0)'],
  [196, 'rgb(255, 0, 0)'],
  [232, 'rgb(8, 8, 8)'],
  [255, 'rgb(238, 238, 238)'],
])('maps indexed foreground color %i', (index, rgb) => {
  expect(parseJobLogLines(`\u001b[38;5;${index}mcolor`)[0].parts).toEqual([
    { text: 'color', style: { rgb } },
  ]);
});

it.each([
  ['2026-09-30T01:00:00.000Z \u001b[31m##[error]Build failed', 'error'],
  ['::ERROR file=build.ts,line=4::Build failed', 'error'],
  ['[warning]Unused value', 'warning'],
  ['::warning::Unused value', 'warning'],
  ['::group::Build application', 'group'],
  ['#[endgroup]', 'group'],
  ['##[command]npm test', 'command'],
  ['failed tests: 0', undefined],
  ['All error cases passed', undefined],
  ['prefix ::error::Build failed', undefined],
])('detects only explicit annotations in %j', (content, annotation) => {
  expect(parseJobLogLines(content)[0].annotation).toBe(annotation);
});
