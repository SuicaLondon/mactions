import { type ReactNode } from 'react';

import { type Job } from '../../../../../shared/api/types';
import { Skeleton } from '../../../../../shared/ui/loading/components/Skeleton';
import type { JobSelection } from '../../types/job-selection';
import { JobStepsSkeleton } from '../workspace/overview/JobStepsSkeleton';
import { JobTreeStep } from './JobTreeStep';

export function JobTreeSteps({
  jobId,
  detail,
  selection,
  tabbable,
}: {
  jobId: number;
  /** The loaded job with its steps; steps load once the job is selected. */
  detail: Job | undefined;
  /** The tree's selection, given only when it is this job or one of its steps. */
  selection: JobSelection | undefined;
  /** The `data-node` id of the row that takes Tab focus. */
  tabbable: string;
}) {
  if (!detail) {
    let placeholder: ReactNode = 'Select this job to load steps';
    if (selection) {
      placeholder = (
        <Skeleton label="Loading steps…">
          <JobStepsSkeleton />
        </Skeleton>
      );
    }
    return (
      <li className="py-1.75 pr-2.5 pl-0 text-xs text-muted" role="none">
        {placeholder}
      </li>
    );
  }
  if (!detail.steps.length) {
    return (
      <li className="py-1.75 pr-2.5 pl-0 text-xs text-muted" role="none">
        No steps reported
      </li>
    );
  }
  return detail.steps.map((step, stepIndex) => (
    <JobTreeStep
      key={step.number}
      jobId={jobId}
      step={step}
      position={{ index: stepIndex, count: detail.steps.length }}
      selected={selection?.stepNumber === step.number}
      tabbable={tabbable}
    />
  ));
}
