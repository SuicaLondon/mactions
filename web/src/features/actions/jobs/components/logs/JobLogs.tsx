import { useMemo, useRef, useState } from 'react';

import { type Job, type JobStep } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { ErrorState } from '../../../../../shared/ui/feedback/components/ErrorState';
import { type RefreshState } from '../../../shared/types/refresh-state';
import { useJobLogSearch } from '../../hooks/use-job-log-search';
import { useJobLogs } from '../../hooks/use-job-logs';
import { parseJobLogLines } from '../../models/job-log-format';
import { jobLogScope } from '../../models/job-log-scope';
import { defaultWrapLines } from '../../models/job-log-wrap';
import { type JobLogSource } from '../../types/job-log-source';
import { JobLogContent } from './JobLogContent';
import { JobLogOutput } from './JobLogOutput';
import { JobLogDownload } from './toolbar/JobLogDownload';
import { JobLogSearch } from './toolbar/JobLogSearch';
import { JobLogToolbar } from './toolbar/JobLogToolbar';
import { JobLogWrapToggle } from './toolbar/JobLogWrapToggle';

export function JobLogs({
  job,
  step,
  source,
  fill = false,
}: {
  job: Job;
  /** The step whose output is shown; without one the viewer shows the whole job. */
  step?: JobStep;
  source: JobLogSource;
  fill?: boolean;
}) {
  const [wrap, setWrap] = useState(defaultWrapLines);
  const { data, isPending, isFetching, error, refetch } = useJobLogs({
    ...source,
    jobId: job.id,
    stepNumber: step?.number,
  });
  const available = data?.state === 'available';
  let content = '';
  if (available) content = data.content;
  const lines = useMemo(() => parseJobLogLines(content), [content]);
  const output = useRef<HTMLPreElement>(null);
  const { input, setInput, counter, navigable, next, previous, clear, highlight } = useJobLogSearch(
    lines,
    output,
  );
  const scope = jobLogScope(job, step, data);
  const retry = () => void refetch();
  // Recorded replay output never refreshes.
  let refresh: RefreshState | null = null;
  if (!source.replay) {
    let refreshError: Error | null = null;
    if (data && error) refreshError = error;
    refresh = { error: refreshError, refreshing: isFetching, onRefresh: retry };
  }

  return (
    <div
      className={cn(
        'my-3 overflow-hidden rounded-md border border-slate-700',
        'bg-slate-950 text-slate-100 scheme-dark',
        // Clip without a scroll container so the toolbar can stick to the page on phones.
        'max-md:overflow-clip',
        { 'm-0 flex min-h-0 flex-1 flex-col': fill },
      )}
    >
      <JobLogToolbar
        outputLabel={scope.outputLabel}
        scopeName={scope.step?.name || job.name}
        logLabel={scope.label}
        githubUrl={job.url}
        refresh={refresh}
        search={
          <JobLogSearch
            value={input}
            counter={counter}
            navigable={navigable}
            disabled={!available}
            onChange={setInput}
            onNext={next}
            onPrevious={previous}
            onClear={clear}
          />
        }
      >
        <JobLogWrapToggle checked={wrap} disabled={!available} onChange={setWrap} />
        <JobLogDownload content={data?.content} filename={scope.filename} disabled={!available} />
      </JobLogToolbar>
      {!!(error && !data) && (
        <ErrorState
          tone="dark"
          className="bg-slate-950"
          title="Couldn't load log output"
          error={error}
          retrying={isFetching}
          onRetry={retry}
        />
      )}
      <JobLogOutput
        data={data}
        pending={isPending}
        failed={!!error}
        recorded={!!source.replay}
        fill={fill}
      >
        <JobLogContent
          lines={lines}
          empty={!content}
          highlight={highlight}
          logKey={`${job.id}:${step?.number ?? 'all'}`}
          fill={fill}
          wrap={wrap}
          label={scope.label}
          outputRef={output}
        />
      </JobLogOutput>
    </div>
  );
}
