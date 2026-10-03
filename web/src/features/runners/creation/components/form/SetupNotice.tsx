import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';
import { CreationNotice } from './CreationNotice';

export function SetupNotice() {
  const { create } = useRunnerCreationContext();
  if (!create.isPending) return null;
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
