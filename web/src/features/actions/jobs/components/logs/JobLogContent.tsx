import { type RefObject, useEffect } from 'react';

import { cn } from '../../../../../shared/lib/cn';
import { useJobLogView } from '../../hooks/use-job-log-view';
import { scrollLogToLine } from '../../models/job-log-errors';
import { type LogLine } from '../../models/job-log-format';
import { type LogHighlight, revealLogMatch } from '../../models/job-log-search';
import { JobLogErrorSummary } from './JobLogErrorSummary';
import { JobLogLines } from './lines/JobLogLines';

/** The available output with its pinned error summary and search highlights. */
export function JobLogContent({
  lines,
  empty,
  highlight,
  logKey,
  fill,
  wrap,
  label,
  outputRef: output,
}: {
  lines: LogLine[];
  empty: boolean;
  highlight: LogHighlight;
  logKey: string;
  fill: boolean;
  wrap: boolean;
  label: string;
  /** The output element, shared with search so a new query starts at the line in view. */
  outputRef: RefObject<HTMLPreElement | null>;
}) {
  const { errors, showSummary } = useJobLogView(lines, logKey, output);
  const { byLine, active, revealKey } = highlight;
  const hasActive = active !== undefined;

  useEffect(() => {
    if (!output.current || !hasActive) return;
    revealLogMatch(output.current);
  }, [revealKey, hasActive, output]);
  return (
    <>
      {!!showSummary && (
        <JobLogErrorSummary
          errors={errors}
          onSelect={(number) => {
            if (output.current) scrollLogToLine(output.current, number);
          }}
        />
      )}
      <pre
        ref={output}
        className={cn(
          'm-0 max-h-140 overflow-auto bg-slate-950 px-0 py-3 font-mono',
          'text-xs/5 whitespace-pre tab-4 select-text',
          {
            'min-h-56': !fill,
            'max-h-none min-h-0 flex-1': fill,
            'wrap-anywhere whitespace-pre-wrap': wrap,
          },
        )}
        data-wrapped={wrap || undefined}
        tabIndex={0}
        aria-label={label}
      >
        <JobLogLines lines={lines} empty={empty} matches={byLine} active={active} wrap={wrap} />
      </pre>
    </>
  );
}
