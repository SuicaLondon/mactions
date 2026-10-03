import { RunnerWorkspaceContext } from '../../runners/context/runner-workspace-context';
import { useRunnerWorkspaceState } from '../../runners/hooks/use-runner-workspace-state';
import { useGitHubSetup } from '../../setup/hooks/use-github-setup';
import type { ProviderProps } from '../types';
import { NavigationBridge } from './NavigationBridge';

export function RunnerWorkspaceProvider({ children }: ProviderProps) {
  const { welcome } = useGitHubSetup();
  const runners = useRunnerWorkspaceState(welcome);
  return (
    <RunnerWorkspaceContext value={runners}>
      <NavigationBridge>{children}</NavigationBridge>
    </RunnerWorkspaceContext>
  );
}
