import { cn } from '../../../../../../shared/lib/cn';
import { type LogTime } from '../../../models/job-log-format';

/**
 * The line number and short UTC time. It sticks to the left edge so both stay
 * visible while the output scrolls horizontally to a long line or match. The
 * text comes from generated content so copied output keeps the original lines.
 * Phones show only the line number.
 */
export function JobLogGutter({
  number,
  time,
  timed,
}: {
  number: number;
  time: LogTime | undefined;
  timed: boolean;
}) {
  return (
    <span
      className={cn(
        'sticky left-0 inline-flex bg-slate-950 text-slate-400',
        'indent-0 select-none group-hover:bg-slate-900',
        'before:w-12 before:pr-3.5 before:text-right before:content-line-number',
        // Phones hide the time column so the output keeps its width; the title still has it.
        { 'after:w-20 after:pr-3 after:content-line-time max-md:after:hidden': timed },
      )}
      data-number={number}
      data-time={time?.label ?? ''}
      title={time?.iso}
    />
  );
}
