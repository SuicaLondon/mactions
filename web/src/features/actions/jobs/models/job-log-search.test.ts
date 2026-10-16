import { afterEach, expect, it, vi } from 'vitest';

import { parseJobLogLines } from './job-log-format';
import { findLogMatches, highlightParts, maxLineMatches, revealLogMatch } from './job-log-search';

it('finds case-insensitive plain-text matches across lines', () => {
  const lines = parseJobLogLines('Build OK\nbuild failed (a.b)\nnothing');
  expect(findLogMatches(lines, 'BUILD').matches).toEqual([
    { line: 1, start: 0, end: 5 },
    { line: 2, start: 0, end: 5 },
  ]);
  expect(findLogMatches(lines, '(a.b)').matches).toEqual([{ line: 2, start: 13, end: 18 }]);
  expect(findLogMatches(lines, '').matches).toEqual([]);
});

it('caps matches on a single line', () => {
  const lines = parseJobLogLines('x'.repeat(maxLineMatches * 2));
  expect(findLogMatches(lines, 'x').matches).toHaveLength(maxLineMatches);
});

it('splits styled parts at match boundaries and marks the active match', () => {
  const [line] = parseJobLogLines('ab\u001b[31mcd\u001b[0mab');
  const { matches } = findLogMatches([line], 'bc');
  expect(highlightParts(line.parts, matches, 1)).toEqual([
    { text: 'a', style: {} },
    { text: 'b', style: {}, mark: 'active' },
    { text: 'c', style: { color: 'red' }, mark: 'active' },
    { text: 'd', style: { color: 'red' } },
    { text: 'ab', style: {} },
  ]);
});

/** An output holding an active match at `top`; returns the output and the match's scroll spy. */
function outputWithActiveMatch(scrollHeight: number, clientHeight: number, top: number) {
  const output = document.createElement('pre');
  const mark = document.createElement('mark');
  mark.setAttribute('data-active', '');
  output.append(mark);
  vi.spyOn(output, 'scrollHeight', 'get').mockReturnValue(scrollHeight);
  vi.spyOn(output, 'clientHeight', 'get').mockReturnValue(clientHeight);
  vi.spyOn(output, 'getBoundingClientRect').mockReturnValue({ top: 0, left: 0 } as DOMRect);
  vi.spyOn(mark, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom: top + 20,
    height: 20,
    left: 0,
    width: 10,
  } as DOMRect);
  return { output, scrollIntoView: vi.spyOn(mark, 'scrollIntoView') };
}

afterEach(() => {
  vi.restoreAllMocks();
});

it('scrolls only the output to a match when the output scrolls itself', () => {
  const { output, scrollIntoView } = outputWithActiveMatch(2000, 300, 900);
  revealLogMatch(output);
  expect(output.scrollTop).toBe(800);
  expect(scrollIntoView).not.toHaveBeenCalled();
});

it('centres an off-screen match in the page when the output grows with its content', () => {
  const { output, scrollIntoView } = outputWithActiveMatch(4000, 4000, window.innerHeight + 500);
  revealLogMatch(output);
  expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'center', inline: 'nearest' });
  expect(output.scrollTop).toBe(0);
});

it('leaves the page alone when the match is already on screen', () => {
  const { output, scrollIntoView } = outputWithActiveMatch(400, 400, 100);
  revealLogMatch(output);
  expect(scrollIntoView).not.toHaveBeenCalled();
});
