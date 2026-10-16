import type { ReactNode } from 'react';

import type { Job } from '../../../../../../shared/api/types';
import { duration } from '../../../../../../shared/lib/activity-format';
import { Status } from '../../../../shared/components/Status';
import { StepsTable } from '../../../../shared/components/table/StepsTable';
import { StepsTableRow } from '../../../../shared/components/table/StepsTableRow';

export function HistoricalStepsContent({
  steps,
  refreshIndicator,
}: {
  steps: Job['steps'];
  /** Shown in the caption row, which reserves its space so a failed refresh never shifts the steps. */
  refreshIndicator: ReactNode;
}) {
  if (steps.length)
    return (
      <StepsTable
        caption={
          <span className="flex items-center justify-between gap-2">
            <span>Step results and duration</span>
            {refreshIndicator}
          </span>
        }
      >
        {steps.map((step) => (
          <StepsTableRow
            key={step.number}
            name={step.name}
            result={<Status compact status={step.status} conclusion={step.conclusion} />}
            duration={duration(step.started_at, step.completed_at, step.status === 'in_progress')}
          />
        ))}
      </StepsTable>
    );
  return (
    <div className="flex flex-1 flex-col items-center gap-1 p-5">
      <p className="m-0 text-muted">No steps are available for this job.</p>
      {refreshIndicator}
    </div>
  );
}
