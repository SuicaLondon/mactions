import { use } from 'react';

import { RunnerWorkspaceContext } from '../context/runner-workspace-context';

export function useRunnerWorkspace() {
  const workspace = use(RunnerWorkspaceContext);
  if (!workspace) throw new Error('Runner workspace requires AppProviders.');
  return workspace;
}
