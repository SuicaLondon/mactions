import { useRunnerCreationStatus } from '../../hooks/use-runner-creation-status';
import { CreationNotice } from './CreationNotice';

/** Covers the step while the runner is downloaded, registered, and started. */
export function SetupNotice() {
  const { pending } = useRunnerCreationStatus();
  if (!pending) return null;
  return (
    <CreationNotice>
      <div>
        <strong>Setting up your runner</strong>
        <p className="mt-1 text-muted">
          Downloading, registering, and starting the runner. This may take a few minutes. Keep this
          window open.
        </p>
      </div>
    </CreationNotice>
  );
}
