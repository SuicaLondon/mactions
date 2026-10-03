import { cn } from '../../../../shared/lib/cn';

interface WorkflowGraphHeadingProps {
  runCount: number;
  jobCount: number;
}

export function WorkflowGraphHeading({ runCount, jobCount }: WorkflowGraphHeadingProps) {
  let runNoun = 'runs';
  let jobNoun = 'jobs';
  if (runCount === 1) runNoun = 'run';
  if (jobCount === 1) jobNoun = 'job';
  return (
    <header
      className={cn(
        'workflow-graph-heading mx-0 mb-0 flex items-center justify-between gap-4',
        'border-b border-line px-4 py-3 max-sm:gap-2 max-sm:py-2.75',
      )}
    >
      <div>
        <h3 className="m-0 text-xs font-semibold">Workflow graph</h3>
        <p className="mt-0.75 text-xs text-muted">Runs and assigned jobs</p>
      </div>
      <span className="text-xs whitespace-nowrap text-muted">
        {runCount} {runNoun} · {jobCount} {jobNoun}
      </span>
    </header>
  );
}
