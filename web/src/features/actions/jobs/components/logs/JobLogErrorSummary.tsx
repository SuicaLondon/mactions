import { cn } from '../../../../../shared/lib/cn';
import { type LogErrorLine } from '../../models/job-log-errors';

const visibleErrors = 3;

export function JobLogErrorSummary({
  errors,
  onSelect,
}: {
  errors: LogErrorLine[];
  onSelect: (number: number) => void;
}) {
  const hidden = errors.length - visibleErrors;
  let hiddenLabel = 'errors';
  if (hidden === 1) hiddenLabel = 'error';
  return (
    <section
      className={cn(
        'max-h-24 shrink-0 overflow-auto border-b border-slate-700',
        'bg-slate-900 px-3.5 py-1.5 text-xs max-md:max-h-36 pointer-coarse:max-h-36',
      )}
      aria-label="Errors in this log"
    >
      {!errors.length && (
        <p className="m-0 py-0.5 text-slate-400">No errors in the latest output.</p>
      )}
      <ul className="m-0 list-none p-0">
        {errors.slice(0, visibleErrors).map((error) => (
          <li key={error.number}>
            <button
              className={cn(
                'flex min-h-6 w-full min-w-0 items-baseline justify-start gap-2 rounded-sm',
                'border-0',
                'bg-transparent px-1 py-0.5 text-left text-xs text-red-300 shadow-none',
                'hover:bg-slate-800 hover:filter-none',
                'max-md:min-h-10 max-md:items-center pointer-coarse:min-h-10',
                'pointer-coarse:items-center',
              )}
              title={error.text}
              aria-label={`Go to line ${error.number}: ${error.text}`}
              onClick={() => onSelect(error.number)}
            >
              <span className="shrink-0 font-mono text-slate-400 tabular-nums">
                Line {error.number}
              </span>
              <span className="min-w-0 truncate font-mono">{error.text}</span>
            </button>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <p className="m-0 px-1 py-0.5 text-slate-400">
          {hidden} more {hiddenLabel} in the output
        </p>
      )}
    </section>
  );
}
