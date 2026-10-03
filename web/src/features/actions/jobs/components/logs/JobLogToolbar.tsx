import type { Job, JobStep } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { ExternalLinkIcon } from '../../../../../shared/ui/icons/navigation/ExternalLinkIcon';
import { TerminalIcon } from '../../../../../shared/ui/icons/system/TerminalIcon';
import { type useJobLogs } from '../../hooks/use-job-logs';
import { type ReplayLogs } from '../../types/replay-logs';
import { JobLogRefresh } from './JobLogRefresh';

export function JobLogToolbar({
  job,
  outputStep,
  outputLabel,
  logs,
  wrap,
  setWrap,
  download,
  replay,
  label,
}: {
  job: Job;
  outputStep: JobStep | undefined;
  outputLabel: string;
  logs: ReturnType<typeof useJobLogs>;
  wrap: boolean;
  setWrap: (wrap: boolean) => void;
  download: () => void;
  replay?: ReplayLogs;
  label: string;
}) {
  return (
    <div
      className={cn(
        'job-log-toolbar flex shrink-0 flex-wrap items-center justify-between gap-2',
        'border-b border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-100',
      )}
    >
      <span className="flex min-w-0 flex-wrap items-center gap-2.5">
        <TerminalIcon className="size-3.75 text-sky-300" />
        <span>{outputLabel}</span>
        <strong
          className={cn(
            'job-log-scope max-w-95 overflow-hidden text-xs text-ellipsis whitespace-nowrap',
            'text-slate-400',
          )}
        >
          {outputStep?.name || job.name}
        </strong>
      </span>
      <div className="flex flex-wrap items-center gap-2.5">
        {!!(logs.data?.state === 'available') && (
          <>
            <label className="flex items-center gap-1.25">
              <input
                className="min-h-auto accent-blue-300"
                type="checkbox"
                checked={wrap}
                onChange={(event) => setWrap(event.target.checked)}
              />
              Wrap lines
            </label>
            <button
              className={cn(
                'min-h-6 rounded-md border border-slate-700 bg-slate-800 py-0.75 text-xs',
                'text-slate-100 shadow-none',
              )}
              onClick={download}
            >
              Download
            </button>
          </>
        )}
        <JobLogRefresh replay={replay} label={label} logs={logs} />
        <a
          className="inline-flex items-center gap-1 text-sky-300 no-underline"
          href={job.url}
          target="_blank"
          rel="noreferrer"
        >
          GitHub
          <ExternalLinkIcon className="size-3.75 text-sky-300" />
        </a>
      </div>
    </div>
  );
}
