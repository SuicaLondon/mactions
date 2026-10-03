import { cn } from '../../../../shared/lib/cn';
import type { WorkflowRun as WorkflowRunModel } from '../../types/workflow-graph';
import { WorkflowJob } from './WorkflowJob';
import { WorkflowRunSource } from './WorkflowRunSource';

interface WorkflowRunProps {
  run: WorkflowRunModel;
  selectedJobId: number | null;
  onSelectJob: (id: number) => void;
  at: number;
}

export function WorkflowRun({ run, selectedJobId, onSelectJob, at }: WorkflowRunProps) {
  const first = run.jobs[0];
  let runLabel = `${first.workflow || 'Workflow'} #${first.run_number}`;
  if (first.run_attempt && first.run_attempt > 1) runLabel += ` · attempt ${first.run_attempt}`;
  return (
    <li
      className={cn(
        'workflow-graph-run grid grid-cols-[--spacing(47.5)_minmax(--spacing(62.5),_1fr)]',
        'items-center px-0 py-1.5 not-first:mt-2 not-first:border-t',
        'not-first:border-dashed not-first:border-line not-first:pt-3.5',
      )}
      aria-label={runLabel}
    >
      <WorkflowRunSource run={run} />
      <ul
        className="workflow-graph-jobs m-0 min-w-0 list-none pt-0 pr-0 pb-0 pl-12"
        aria-label={`Jobs in ${runLabel}`}
      >
        {run.jobs.map((job) => (
          <WorkflowJob
            key={job.id}
            job={job}
            runLabel={runLabel}
            selected={selectedJobId === job.id}
            onSelectJob={onSelectJob}
            at={at}
          />
        ))}
      </ul>
    </li>
  );
}
