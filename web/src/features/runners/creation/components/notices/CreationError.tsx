import { cn } from '../../../../../shared/lib/cn';
import { linkButtonClassName } from '../../../../../shared/ui/controls/buttons/link-button-class';
import { GitHubConnection } from '../../../../github/components/connection/GitHubConnection';
import { useRunnerCreationStatus } from '../../hooks/use-runner-creation-status';
import { useRunnerCreationStore } from '../../stores/runner-creation-store';

/**
 * Takes the target step's place after a failed creation, the way the setup notice does while
 * creating: it covers the step inside the step's own box, so the dialog keeps its size and the
 * footer never moves. Create runner in the footer retries; Edit settings, at the end of the
 * message, returns to the form.
 */
export function CreationError() {
  const mode = useRunnerCreationStore((state) => state.mode);
  const failure = useRunnerCreationStore((state) => state.failure);
  const setFailure = useRunnerCreationStore((state) => state.setFailure);
  const { pending } = useRunnerCreationStatus();
  // A pending retry shows the setup notice instead.
  if (!failure || pending) return null;
  // The API reports errors as text; this phrase identifies a login without organization runner access.
  const organizationAccess = failure.includes('admin:org scope');
  let message = failure.trimEnd();
  if (!/[.!?]$/u.test(message)) message = `${message}.`;
  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto pt-3">
      <p
        role="alert"
        className={cn(
          'm-0 rounded-md border border-danger/20 bg-danger/4 px-3',
          'py-2.5 text-xs/normal wrap-anywhere whitespace-pre-wrap text-danger',
        )}
      >
        {message} If an incomplete runner appears, use Resume setup before trying to create another.{' '}
        <button
          type="button"
          className={cn(linkButtonClassName, 'min-h-0 underline')}
          onClick={() => setFailure(null)}
        >
          Edit settings
        </button>
      </p>
      {mode === 'automatic' && (
        <GitHubConnection
          key={failure}
          variant="card"
          organizationAccess={organizationAccess}
          className="mt-3"
        />
      )}
    </div>
  );
}
