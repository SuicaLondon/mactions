import type { Job, JobStep } from '../../../../shared/api/types';
import { stateFor } from '../../../../shared/lib/activity-format';

export interface JobProgress {
  /** The visible completion or failure text. */
  label: string;
  /** The progress bar's accessible name; its value and maximum match it. */
  outcome: string;
  value: number;
  max: number;
  tone: string;
  /** The first failed step of a failed Job. */
  failedStep: JobStep | undefined;
}

/**
 * How far a Job got. A failed Job reports the failed step's number against the
 * highest step number, because step numbers can skip steps GitHub did not
 * report; other Jobs count completed steps.
 */
export function jobProgress(job: Job): JobProgress {
  const { tone } = stateFor(job.status, job.conclusion);
  let failedStep: JobStep | undefined;
  if (tone === 'failure') {
    failedStep = job.steps.find(
      (step) => stateFor(step.status, step.conclusion).tone === 'failure',
    );
  }
  if (failedStep) {
    const lastNumber = Math.max(...job.steps.map((step) => step.number));
    return {
      label: `Failed at step ${failedStep.number} · ${failedStep.name}`,
      outcome: `Failed at step ${failedStep.number} of ${lastNumber}`,
      value: failedStep.number,
      max: lastNumber,
      tone,
      failedStep,
    };
  }
  const completed = job.steps.filter((step) => step.status === 'completed').length;
  const total = job.steps.length;
  return {
    label: `${completed}/${total} steps completed`,
    outcome: `${completed} of ${total} steps completed`,
    value: completed,
    max: Math.max(1, total),
    tone,
    failedStep,
  };
}
