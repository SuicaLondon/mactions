import { friendlyRefreshInterval } from '../../../actions/data/models/activity-data';
import type { RunnerDataCoverage } from '../models/runner-data-coverage';

export function RunnerDataNotes({
  coverage: { inventoryMessage, workMessage, refresh },
}: {
  coverage: RunnerDataCoverage;
}) {
  return (
    <details className="mx-0 mt-2.5 max-w-225 text-xs text-muted">
      <summary className="cursor-pointer max-md:py-3">Data coverage</summary>
      {!!inventoryMessage && <p className="my-2 max-w-prose leading-relaxed">{inventoryMessage}</p>}
      {!!workMessage && <p className="my-2 max-w-prose leading-relaxed">{workMessage}</p>}
      {!!refresh && (
        <p className="my-2 max-w-prose leading-relaxed">
          Runners update {friendlyRefreshInterval(refresh.inventorySeconds)}; work updates{' '}
          {friendlyRefreshInterval(refresh.workSeconds)}.
        </p>
      )}
    </details>
  );
}
