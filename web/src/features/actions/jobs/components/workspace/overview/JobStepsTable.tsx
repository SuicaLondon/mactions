import { Fragment } from 'react';

import type { Job } from '../../../../../../shared/api/types';
import { duration, stateFor } from '../../../../../../shared/lib/activity-format';
import { cn } from '../../../../../../shared/lib/cn';
import { ChevronIcon } from '../../../../../../shared/ui/icons/ChevronIcon';
import { Status } from '../../../../shared/components/Status';
import { StepsTable } from '../../../../shared/components/table/StepsTable';
import { StepsTableRow } from '../../../../shared/components/table/StepsTableRow';
import { hiddenStepsBefore } from '../../../models/hidden-steps';

export function JobStepsTable({
  job,
  onSelectStep,
}: {
  job: Job;
  onSelectStep: (number: number) => void;
}) {
  if (!job.steps.length) {
    return (
      <p className="m-0 p-5 text-xs text-muted">GitHub has not reported any steps for this job.</p>
    );
  }
  return (
    <StepsTable
      caption="Steps in this job"
      captionClassName="border-t border-t-line pt-2.25 font-medium"
    >
      {job.steps.map((item, index) => {
        const stepState = stateFor(item.status, item.conclusion);
        const elapsed = duration(item.started_at, item.completed_at, item.status === 'in_progress');
        const hidden = hiddenStepsBefore(job.steps, index);
        let hiddenLabel = `${hidden} steps not reported by GitHub`;
        if (hidden === 1) hiddenLabel = '1 step not reported by GitHub';
        return (
          <Fragment key={item.number}>
            {hidden > 0 && (
              <tr className="bg-transparent">
                <td
                  className="border-b border-b-line px-0 py-1.25 pl-5.5 text-xs text-muted"
                  colSpan={3}
                >
                  {hiddenLabel}
                </td>
              </tr>
            )}
            <StepsTableRow
              name={
                <button
                  className={cn(
                    'flex min-h-6 w-full items-center justify-start gap-2 border-0 bg-transparent p-0',
                    'max-md:min-h-10 pointer-coarse:min-h-10',
                    'pr-2 text-left text-xs whitespace-normal text-foreground shadow-none',
                  )}
                  aria-label={`${item.name}, ${stepState.label}, ${elapsed}`}
                  onClick={() => onSelectStep(item.number)}
                >
                  <span className="min-w-3.5 text-xs text-muted">{item.number}</span>
                  {item.name}
                  <ChevronIcon className="ml-auto size-3 shrink-0 text-muted" />
                </button>
              }
              result={<Status status={item.status} conclusion={item.conclusion} />}
              duration={elapsed}
            />
          </Fragment>
        );
      })}
    </StepsTable>
  );
}
