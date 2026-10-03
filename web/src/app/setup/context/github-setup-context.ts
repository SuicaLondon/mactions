import { createContext } from 'react';

import type { useGitHubSetupState } from '../hooks/use-github-setup-state';

export const GitHubSetupContext = createContext<ReturnType<typeof useGitHubSetupState> | null>(
  null,
);
