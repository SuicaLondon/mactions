import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';

import { logErrorLines } from '../models/job-log-errors';
import { scrollLogToLine } from '../models/job-log-errors';
import type { LogLine } from '../models/job-log-format';

/**
 * Lists a log's error annotations and scrolls to the first error once per
 * log. The summary slot stays mounted for the rest of a log's
 * lifetime once errors appear, so refreshes never move the output.
 */
export function useJobLogView(
  lines: LogLine[],
  logKey: string,
  output: RefObject<HTMLPreElement | null>,
) {
  const errors = useMemo(() => logErrorLines(lines), [lines]);
  const [summaryKey, setSummaryKey] = useState<string | null>(null);
  if (errors.length && summaryKey !== logKey) setSummaryKey(logKey);
  const scrolledKey = useRef<string | null>(null);
  const firstError = errors[0]?.number;

  useEffect(() => {
    const element = output.current;
    if (!element || scrolledKey.current === logKey) return;
    scrolledKey.current = logKey;
    if (firstError === undefined || element.scrollTop !== 0) return;
    scrollLogToLine(element, firstError);
  }, [firstError, logKey, output]);

  return { errors, showSummary: summaryKey === logKey || errors.length > 0 };
}
