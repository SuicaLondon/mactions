import { useState } from 'react';

import type { Job, JobStep } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { useJobLogs } from '../../hooks/use-job-logs';
import { type ReplayLogs } from '../../types/replay-logs';
import { JobLogOutput } from './JobLogOutput';
import { JobLogToolbar } from './JobLogToolbar';

export function JobLogs({
  job,
  runnerId,
  repository,
  step,
  replay,
  fill = false,
}: {
  job: Job;
  runnerId?: number;
  repository: string;
  step?: JobStep;
  replay?: ReplayLogs;
  fill?: boolean;
}) {
  const [wrap, setWrap] = useState(false);
  const logs = useJobLogs({
    jobId: job.id,
    repository,
    runnerId,
    stepNumber: step?.number,
    replay,
  });
  let outputStep = step;
  if (logs.data?.scope === 'job') outputStep = undefined;
  let label = `Full logs for ${job.name}`;
  let outputLabel = 'Full job output';
  let filename = `job-${job.id}.log`;
  if (outputStep) {
    label = `Logs for ${outputStep.name}`;
    outputLabel = 'Step output';
    filename = `job-${job.id}-step-${outputStep.number}.log`;
  }

  function download() {
    if (!logs.data) return;
    const url = URL.createObjectURL(
      new Blob([logs.data.content], { type: 'text/plain;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div
      className={cn(
        'job-log-viewer my-3 overflow-hidden rounded-md border border-slate-700',
        'bg-slate-950 text-slate-100 scheme-dark',
        { 'm-0 flex min-h-0 flex-1 flex-col': fill },
      )}
    >
      <JobLogToolbar
        job={job}
        outputStep={outputStep}
        outputLabel={outputLabel}
        logs={logs}
        wrap={wrap}
        setWrap={setWrap}
        download={download}
        replay={replay}
        label={label}
      />
      {!!logs.error && (
        <p
          className={cn(
            'job-log-message m-0 px-4 py-3.5 text-xs leading-relaxed wrap-anywhere',
            'text-slate-300',
          )}
          role="alert"
        >
          {logs.error.message}
        </p>
      )}
      <JobLogOutput logs={logs} fill={fill} wrap={wrap} label={label} />
    </div>
  );
}
