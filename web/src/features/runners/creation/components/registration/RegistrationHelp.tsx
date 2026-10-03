import { GitHubConnection } from '../../../../github/components/connection/GitHubConnection';
import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';

export function RegistrationHelp() {
  const { mode, connected, connection } = useRunnerCreationContext();
  if (mode === 'token') {
    return (
      <p className="detail-help create-step-help mx-0 mt-3.75 mb-0 text-xs leading-normal text-muted">
        No GitHub login is required. You will enter a registration token in the final step.
      </p>
    );
  }
  if (connected) {
    return (
      <p className="detail-help create-step-help mx-0 mt-3.75 mb-0 text-xs leading-normal text-muted">
        Connected as @{connection.data?.login}. Continue to choose a target.
      </p>
    );
  }
  return <GitHubConnection />;
}
