import { cn } from '../../../../shared/lib/cn';
import { refreshIntervalLabel } from '../../../actions/data/models/activity-data';
import type { RunnerListState } from '../models/runner-list-state';
interface RunnerDataNotesProps {
  inventory: RunnerListState['inventory'];
  work: RunnerListState['work'];
  connected: boolean | undefined;
}
export function RunnerDataNotes({ inventory, work, connected }: RunnerDataNotesProps) {
  let dataSummary = 'Data coverage';
  if (inventory.query.error ?? work.query.error) dataSummary = 'Some data is unavailable';
  return (
    <details
      className="activity-data-notes mx-0 mt-2.5 max-w-225 text-xs text-muted"
      open={Boolean(inventory.query.error ?? work.query.error)}
    >
      <summary className="cursor-pointer">{dataSummary}</summary>
      {!!inventory.query.error && (
        <p
          className={cn(
            'error-message m-0 mx-0 rounded-md border border-red-500/20 bg-red-500/4 px-3',
            'my-2 py-2.5 text-xs wrap-anywhere whitespace-pre-wrap text-danger',
            'leading-relaxed',
          )}
          role="status"
        >
          {inventory.query.error.message}
        </p>
      )}
      {!!work.query.error && (
        <p
          className={cn(
            'error-message m-0 mx-0 rounded-md border border-red-500/20 bg-red-500/4 px-3',
            'my-2 py-2.5 text-xs wrap-anywhere whitespace-pre-wrap text-danger',
            'leading-relaxed',
          )}
          role="status"
        >
          Current work is unavailable: {work.query.error.message}
        </p>
      )}
      {!!inventory.message && <p className="my-2 leading-relaxed">{inventory.message}</p>}
      {!!work.query.data?.message && (
        <p className="my-2 leading-relaxed">{work.query.data.message}</p>
      )}
      {!!(
        connected &&
        (inventory.refreshIntervalSeconds > 30 || work.refreshIntervalSeconds > 30)
      ) && (
        <p className="my-2 leading-relaxed">
          Runners update every {refreshIntervalLabel(inventory.refreshIntervalSeconds)}; work every{' '}
          {refreshIntervalLabel(work.refreshIntervalSeconds)}.
        </p>
      )}
    </details>
  );
}
