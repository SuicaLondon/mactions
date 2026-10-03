import { cn } from '../../../../../shared/lib/cn';
import { GitHubConnection } from '../../../../github/components/connection/GitHubConnection';
import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';

export function CreationError() {
  const { create, mode } = useRunnerCreationContext();
  if (!create.error) return null;
  return (
    <>
      <p
        className={cn(
          'error-message m-0 mx-0 rounded-md border border-red-500/20 bg-red-500/4 px-3',
          'py-2.5 text-xs leading-normal wrap-anywhere whitespace-pre-wrap text-danger',
        )}
      >
        {create.error.message} If an incomplete runner appears, use Resume Setup before trying to
        create another.
      </p>
      {!!(mode === 'automatic') && <GitHubConnection />}
    </>
  );
}
