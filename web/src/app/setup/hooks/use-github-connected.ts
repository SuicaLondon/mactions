import { useConnection } from '../../../features/github/hooks/use-connection';

export function useGitHubConnected() {
  return Boolean(useConnection().data?.connected);
}
