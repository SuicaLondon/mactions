import type { Job, JobLogs, JobStep } from '../../../../shared/api/types';

/** What a log viewer shows: the whole job, or one step when GitHub returned step output. */
export interface JobLogScope {
  /** The step whose output is shown, or undefined for the full job output. */
  step: JobStep | undefined;
  label: string;
  /** Names the output; a step that fell back to the job log says so. */
  outputLabel: string;
  filename: string;
}

/** A step request can fall back to the whole job's output when GitHub has no step log. */
export function jobLogScope(job: Job, step: JobStep | undefined, data: JobLogs | undefined) {
  let outputStep = step;
  if (data?.scope === 'job') outputStep = undefined;
  const scope: JobLogScope = {
    step: outputStep,
    label: `Full logs for ${job.name}`,
    outputLabel: 'Full job output',
    filename: `job-${job.id}.log`,
  };
  // The notice under the toolbar explains the fallback; the step is already named above it.
  if (step && !outputStep) scope.outputLabel = 'Full job log';
  if (outputStep) {
    scope.label = `Logs for ${outputStep.name}`;
    scope.outputLabel = 'Step output';
    scope.filename = `job-${job.id}-step-${outputStep.number}.log`;
  }
  return scope;
}
