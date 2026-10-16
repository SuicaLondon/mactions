import type { RunActivity, WorkflowRun } from '../../../features/actions/data/types/activity-types';
import type { Job } from '../../../shared/api/types';
import type { Page } from './app-navigation';
import { isPlaceholderRun } from './page-location';

export type RunPage = Extract<Page, { type: 'run' }>;

export interface RunPagePatch {
  run?: WorkflowRun;
  selectedJobName?: string;
  selectedStepName?: string;
}

/**
 * Fills in the names a Run page opened from a URL lacks, from the Run and Job data once loaded.
 * Returns null when there is nothing new to fill in.
 */
export function runPagePatch(
  page: RunPage,
  activity: RunActivity | undefined,
  job: Pick<Job, 'id' | 'steps'> | undefined,
): RunPagePatch | null {
  const patch: RunPagePatch = {};
  if (activity && isPlaceholderRun(page.run) && activity.run.id === page.run.id) {
    // The requested attempt keeps the Run's query and URL stable.
    patch.run = { ...activity.run, attempt: page.run.attempt };
  }
  if (page.selectedJobId !== undefined && !page.selectedJobName) {
    const name = activity?.jobs.find((item) => item.id === page.selectedJobId)?.name;
    if (name) patch.selectedJobName = name;
  }
  if (page.selectedStepNumber !== undefined && !page.selectedStepName && job) {
    const name = job.steps.find((step) => step.number === page.selectedStepNumber)?.name;
    if (job.id === page.selectedJobId && name) patch.selectedStepName = name;
  }
  if (!patch.run && !patch.selectedJobName && !patch.selectedStepName) return null;
  return patch;
}
