import { InlineLoading } from '../../../../shared/ui/loading/components/InlineLoading';
import { type useRunnerList } from '../hooks/use-runner-list';

export function RunnerCount({
  awaitingInventory,
  rows,
}: {
  awaitingInventory: ReturnType<typeof useRunnerList>['awaitingInventory'];
  rows: ReturnType<typeof useRunnerList>['rows'];
}) {
  if (awaitingInventory) return <InlineLoading label="Loading runner count…" className="size-4" />;
  return rows.length;
}
