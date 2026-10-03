import { createContext } from 'react';

import type { useRunnerWorkspaceState } from '../hooks/use-runner-workspace-state';

export const RunnerWorkspaceContext = createContext<ReturnType<
  typeof useRunnerWorkspaceState
> | null>(null);
