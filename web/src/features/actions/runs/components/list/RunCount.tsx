import { InlineLoading } from '../../../../../shared/ui/loading/components/InlineLoading';
import { type RunListHeader } from './RunListHeader';

export function RunCount({
  query,
  runs,
}: {
  query: Parameters<typeof RunListHeader>[0]['query'];
  runs: Parameters<typeof RunListHeader>[0]['runs'];
}) {
  if (query.isPending) return <InlineLoading label="Loading run count…" className="h-4.5 w-24" />;
  let unit = 'runs';
  if (runs.length === 1) unit = 'run';
  return (
    <>
      {runs.length} {unit} loaded
    </>
  );
}
