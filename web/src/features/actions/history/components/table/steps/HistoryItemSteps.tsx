import { type JobSummary } from '../../../../data/types/activity-types';
import { HistoricalSteps } from './HistoricalSteps';

/** The expanded row under an execution, listing its steps. */
export function HistoryItemSteps({ job, repository }: { job: JobSummary; repository: string }) {
  return (
    <tr>
      <td className="table-cell h-auto bg-surface p-0 whitespace-normal" colSpan={6}>
        <div
          id={`history-job-${job.id}`}
          className="pt-0.5 pr-4.5 pb-3 pl-8.25 max-md:px-3"
          role="region"
          aria-label={`Steps for run #${job.run_number}`}
        >
          <HistoricalSteps repository={repository} jobId={job.id} />
        </div>
      </td>
    </tr>
  );
}
