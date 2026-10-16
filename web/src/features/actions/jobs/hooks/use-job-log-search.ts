import { type RefObject, useMemo, useState } from 'react';

import type { LogLine } from '../models/job-log-format';
import { findLogMatches, firstVisibleLogLine, type LogHighlight } from '../models/job-log-search';
import {
  activeMatchIndex,
  initialLogSearchPosition,
  logSearchCounter,
  type LogSearchPosition,
  stepLogSearchPosition,
} from '../models/log-search-position';
import { useLogSearchQuery } from './use-log-search-query';

/** The search field's controls and the highlight it applies to the output. */
export interface JobLogSearchState {
  input: string;
  setInput: (input: string) => void;
  counter: string;
  navigable: boolean;
  next: () => void;
  previous: () => void;
  clear: () => void;
  highlight: LogHighlight;
}

/**
 * Searches a log: matches the debounced query against the lines and tracks the current
 * match, which wraps in both directions. A new query starts at the first match on or after
 * the line in view when it was typed, such as the error line the log scrolled to.
 */
export function useJobLogSearch(
  lines: LogLine[],
  output: RefObject<HTMLElement | null>,
): JobLogSearchState {
  const field = useLogSearchQuery();
  const { input, query } = field;
  const [position, setPosition] = useState<LogSearchPosition>(initialLogSearchPosition);
  const [fromLine, setFromLine] = useState(1);

  const search = useMemo(() => findLogMatches(lines, query), [lines, query]);
  const count = search.matches.length;
  const index = activeMatchIndex(position, query, search.matches, fromLine);
  const active = search.matches.at(index);

  function move(step: number) {
    if (input !== query) {
      // The pending text becomes the query and starts from the line in view.
      field.commit();
      setPosition(initialLogSearchPosition);
      return;
    }
    if (!count) return;
    setPosition(stepLogSearchPosition(index, query, count, step));
  }

  return {
    input,
    setInput: (value) => {
      if (output.current) setFromLine(firstVisibleLogLine(output.current));
      field.setInput(value);
    },
    counter: logSearchCounter(search, query, index),
    navigable: count > 0,
    next: () => move(1),
    previous: () => move(-1),
    clear: () => {
      field.clear();
      setPosition(initialLogSearchPosition);
    },
    highlight: {
      byLine: search.byLine,
      active,
      revealKey: JSON.stringify([query, index, active?.line, active?.start]),
    },
  };
}
