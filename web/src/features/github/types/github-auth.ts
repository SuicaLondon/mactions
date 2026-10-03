import type { useGitHubAuth } from '../hooks/authorization/use-github-auth';

export type GitHubAuthState = ReturnType<typeof useGitHubAuth>;
