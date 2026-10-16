import { cn } from '../../../../../shared/lib/cn';
import type { Scope } from '../../../data/types/activity-types';

function emptyCopy(scope: Scope, runnerName: string | undefined, filtered: boolean) {
  let searched = 'Searched all repositories';
  const scopeName = scope.repository || scope.organization;
  if (scopeName) searched = `Searched ${scopeName}`;
  if (filtered) {
    return {
      title: 'No loaded runs match these filters',
      hint: 'Load more history or change the filters.',
    };
  }
  if (runnerName) {
    return {
      title: 'No runs for this runner yet',
      hint: `${searched}. Runs appear here when a workflow job is picked up by this runner.`,
    };
  }
  return {
    title: 'No runs found',
    hint: `${searched} with the selected status. Runs appear here once a workflow starts.`,
  };
}

/** Holds roughly the skeleton table's height so an empty result does not collapse the view. */
export function RunsEmpty({
  scope,
  runnerName,
  filtered,
}: {
  scope: Scope;
  runnerName?: string;
  filtered: boolean;
}) {
  const { title, hint } = emptyCopy(scope, runnerName, filtered);
  return (
    <div
      className={cn(
        'flex min-h-88 flex-col items-center justify-center gap-1.5',
        'rounded-md',
        'border border-dashed border-line p-5 text-center text-xs text-muted',
      )}
    >
      <p className="m-0 text-sm font-medium text-foreground">{title}</p>
      <p className="m-0 max-w-100 leading-normal">{hint}</p>
    </div>
  );
}
