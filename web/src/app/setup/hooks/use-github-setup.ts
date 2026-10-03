import { use } from 'react';

import { GitHubSetupContext } from '../context/github-setup-context';

export function useGitHubSetup() {
  const setup = use(GitHubSetupContext);
  if (!setup) throw new Error('GitHub setup requires AppProviders.');
  return setup;
}
