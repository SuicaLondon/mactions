import { GitHubSetupContext } from '../../setup/context/github-setup-context';
import { useGitHubSetupState } from '../../setup/hooks/use-github-setup-state';
import type { ProviderProps } from '../types';
import { RunnerWorkspaceProvider } from './RunnerWorkspaceProvider';

export function AppProviders({ children }: ProviderProps) {
  const setup = useGitHubSetupState();
  return (
    <GitHubSetupContext value={setup}>
      <RunnerWorkspaceProvider>{children}</RunnerWorkspaceProvider>
    </GitHubSetupContext>
  );
}
