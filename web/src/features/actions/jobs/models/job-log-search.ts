import { logScrollsItself } from './job-log-errors';
import type { LogLine } from './job-log-format';

type LogPart = LogLine['parts'][number];

/** A case-insensitive query match inside one 1-based log line. */
export interface LogMatch {
  line: number;
  start: number;
  end: number;
}

export interface LogSearch {
  matches: LogMatch[];
  byLine: Map<number, LogMatch[]>;
  capped: boolean;
}

/** The matches drawn in the output and the current one to reveal. */
export interface LogHighlight {
  byLine: Map<number, LogMatch[]>;
  active: LogMatch | undefined;
  /** Changes whenever the current match should be scrolled into view again. */
  revealKey: string;
}

export type LogMarkKind = 'match' | 'active';

export interface LogSegment {
  text: string;
  style: LogPart['style'];
  mark?: LogMarkKind;
}

/** Highlighting stops after this many matches on one line to keep long lines cheap. */
export const maxLineMatches = 100;
/** Search stops after this many matches so very large logs stay responsive. */
export const maxLogMatches = 10_000;

export const emptyLogSearch: LogSearch = { matches: [], byLine: new Map(), capped: false };

function escapePattern(query: string) {
  return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Finds case-insensitive plain-text matches in the visible text of each line. */
export function findLogMatches(lines: LogLine[], query: string): LogSearch {
  if (!query) return emptyLogSearch;
  const pattern = new RegExp(escapePattern(query), 'gi');
  const matches: LogMatch[] = [];
  const byLine = new Map<number, LogMatch[]>();
  for (let index = 0; index < lines.length; index++) {
    const text = lines[index].parts.map((part) => part.text).join('');
    const lineMatches: LogMatch[] = [];
    for (const found of text.matchAll(pattern)) {
      if (lineMatches.length === maxLineMatches) break;
      if (matches.length + lineMatches.length === maxLogMatches) break;
      lineMatches.push({ line: index + 1, start: found.index, end: found.index + found[0].length });
    }
    if (!lineMatches.length) continue;
    byLine.set(index + 1, lineMatches);
    matches.push(...lineMatches);
    if (matches.length === maxLogMatches) return { matches, byLine, capped: true };
  }
  return { matches, byLine, capped: false };
}

function markAt(offset: number, matches: LogMatch[], active: number | undefined) {
  const match = matches.find((item) => item.start <= offset && offset < item.end);
  if (!match) return undefined;
  if (match.start === active) return 'active';
  return 'match';
}

function boundaries(matches: LogMatch[], from: number, to: number) {
  const points = new Set([from, to]);
  for (const match of matches) {
    if (match.start > from && match.start < to) points.add(match.start);
    if (match.end > from && match.end < to) points.add(match.end);
  }
  return [...points].sort((left, right) => left - right);
}

/**
 * Splits styled line parts at match boundaries. `active` is the start offset
 * of the current match when it sits on this line.
 */
export function highlightParts(
  parts: LogPart[],
  matches: LogMatch[],
  active: number | undefined,
): LogSegment[] {
  const segments: LogSegment[] = [];
  let offset = 0;
  for (const part of parts) {
    const end = offset + part.text.length;
    const points = boundaries(matches, offset, end);
    for (let index = 0; index < points.length - 1; index++) {
      const segment: LogSegment = {
        text: part.text.slice(points[index] - offset, points[index + 1] - offset),
        style: part.style,
      };
      const mark = markAt(points[index], matches, active);
      if (mark) segment.mark = mark;
      if (segment.text) segments.push(segment);
    }
    offset = end;
  }
  return segments;
}

function outsideWindow(rect: DOMRect) {
  return rect.top < 0 || rect.bottom > window.innerHeight;
}

/**
 * Scrolls the output element so the active match is visible, leaving the position alone when
 * the match is already in view. When the output does not scroll itself, as at phone width,
 * the nearest scrolling ancestor centres the match vertically instead.
 */
export function revealLogMatch(output: HTMLElement) {
  const mark = output.querySelector('mark[data-active]');
  if (!mark) return;
  const bounds = output.getBoundingClientRect();
  const rect = mark.getBoundingClientRect();
  if (!logScrollsItself(output)) {
    if (outsideWindow(rect)) {
      // Also reveals the match horizontally inside the output.
      mark.scrollIntoView({ block: 'center', inline: 'nearest' });
      return;
    }
  } else {
    const top = rect.top - bounds.top;
    if (top < 0 || top + rect.height > output.clientHeight) {
      output.scrollTop = Math.max(0, output.scrollTop + top - output.clientHeight / 3);
    }
  }
  const left = rect.left - bounds.left;
  if (left < 0 || left + rect.width > output.clientWidth) {
    output.scrollLeft = Math.max(0, output.scrollLeft + left - output.clientWidth / 3);
  }
}

/**
 * The 1-based number of the first log line in view, where a new search starts. When the output
 * does not scroll itself, as at phone width, the window's top edge bounds the view instead.
 * Returns 1 when no line is laid out below the top edge.
 */
export function firstVisibleLogLine(output: HTMLElement) {
  const lines = output.querySelectorAll('[data-line]');
  let top = output.getBoundingClientRect().top;
  if (!logScrollsItself(output)) top = Math.max(top, 0);
  // Lines are laid out top to bottom, so a binary search finds the first one below `top`.
  let low = 0;
  let high = lines.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (lines[middle].getBoundingClientRect().bottom > top) high = middle;
    else low = middle + 1;
  }
  if (low === lines.length) return 1;
  return Number(lines[low].getAttribute('data-line')) || 1;
}
