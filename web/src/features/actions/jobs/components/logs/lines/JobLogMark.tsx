import { cn } from '../../../../../../shared/lib/cn';
import { type LogMarkKind } from '../../../models/job-log-search';

/** A search match; the active match stands out from the others. */
export function JobLogMark({ kind, text }: { kind: LogMarkKind; text: string }) {
  const active = kind === 'active';
  return (
    <mark
      className={cn('rounded-xs', {
        'bg-amber-400/35 text-amber-50': !active,
        'bg-amber-300 text-slate-950 outline outline-amber-100': active,
      })}
      data-active={active || undefined}
    >
      {text}
    </mark>
  );
}
