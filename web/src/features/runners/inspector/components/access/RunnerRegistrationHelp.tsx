import { LoadingPlaceholder } from '../../../../../shared/ui/loading/components/LoadingPlaceholder';
import { type useRunnerAccess } from '../../hooks/use-runner-access';
import { RunnerAccessResults } from './RunnerAccessResults';

export function RunnerRegistrationHelp({
  connected,
  access,
}: {
  connected: boolean;
  access: ReturnType<typeof useRunnerAccess>;
}) {
  if (!connected)
    return (
      <p className="detail-help mx-0 mt-2 mb-0 text-xs leading-normal text-muted">
        Connect GitHub CLI from the account status in the header to check access.
      </p>
    );
  return (
    <>
      {!!access.isPending && <LoadingPlaceholder kind="access" />}
      <RunnerAccessResults access={access} />
      <button
        className="min-h-5.5 border-0 bg-transparent p-0 text-xs text-accent shadow-none"
        disabled={access.isFetching}
        onClick={() => void access.refetch()}
      >
        Check access again
      </button>
    </>
  );
}
