import type { LogMatch, LogSearch } from './job-log-search';

/** The chosen match, remembered with the query it was chosen for. */
export interface LogSearchPosition {
  query: string;
  index: number;
}

export const initialLogSearchPosition: LogSearchPosition = { query: '', index: 0 };

/**
 * The first match on or after `line`, so a new search starts where the viewer is reading.
 * It wraps to the first match when every match sits above that line.
 */
export function firstMatchFromLine(matches: LogMatch[], line: number) {
  return Math.max(
    0,
    matches.findIndex((match) => match.line >= line),
  );
}

/**
 * The current match index. A new query starts at the first match on or after `fromLine`;
 * a shorter match list keeps the index on a valid match.
 */
export function activeMatchIndex(
  position: LogSearchPosition,
  query: string,
  matches: LogMatch[],
  fromLine = 1,
) {
  if (position.query !== query) return firstMatchFromLine(matches, fromLine);
  return Math.max(0, Math.min(position.index, matches.length - 1));
}

/** Moves `step` matches from the current `index`, wrapping in both directions. */
export function stepLogSearchPosition(
  index: number,
  query: string,
  count: number,
  step: number,
): LogSearchPosition {
  return { query, index: (index + step + count) % count };
}

/** The counter beside the search field, such as "2 of 5", "10000+" totals, or "No matches". */
export function logSearchCounter(search: LogSearch, query: string, index: number) {
  const count = search.matches.length;
  if (!query) return '';
  if (!count) return 'No matches';
  let total = String(count);
  if (search.capped) total = `${count}+`;
  return `${index + 1} of ${total}`;
}
