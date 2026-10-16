import { cn } from '../../../../shared/lib/cn';
import { GitHubConnection } from '../../../github/components/connection/GitHubConnection';
import { useConnection } from '../../../github/hooks/use-connection';
import { useRunnerCreationStore } from '../stores/runner-creation-store';

// Two reserved lines keep both registration methods the same height, so the actions stay put.
const helpClassName = cn('mx-0 mt-3.75 mb-0 min-h-9 text-xs/normal', 'text-muted');

/** What the chosen method needs next: nothing, or a GitHub connection. */
export function RegistrationHelp() {
  const mode = useRunnerCreationStore((state) => state.mode);
  const connection = useConnection();
  if (mode === 'token') {
    return (
      <p className={helpClassName}>
        No GitHub login is required. You will paste the registration token with the target in the
        next step.
      </p>
    );
  }
  if (connection.data?.connected) {
    return (
      <p className={helpClassName}>
        Connected as @{connection.data.login}. Continue to choose a target.
      </p>
    );
  }
  return <GitHubConnection variant="card" className="mt-3.75" />;
}
