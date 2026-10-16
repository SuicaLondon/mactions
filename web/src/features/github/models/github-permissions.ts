/** Unknown: the token reports no scopes (fine-grained tokens), so GitHub checks each target. */
export type PermissionState = 'granted' | 'missing' | 'unknown';

export interface GitHubPermission {
  id: string;
  title: string;
  detail: string;
  /** Scopes that each satisfy this permission on their own. */
  scopes: readonly string[];
  state: PermissionState;
}

interface PermissionRule {
  id: string;
  title: string;
  detail: string;
  scopes: readonly string[];
}

const RULES: readonly PermissionRule[] = [
  {
    id: 'repository-runners',
    title: 'Repository runners',
    detail: 'Register, label, and remove runners for repositories you administer.',
    scopes: ['repo'],
  },
  {
    id: 'organization-runners',
    title: 'Organization runners',
    detail: 'Register and remove runners shared across an organization you administer.',
    scopes: ['admin:org', 'manage_runners:org'],
  },
  {
    id: 'workflow-activity',
    title: 'Workflow runs and logs',
    detail: 'View runs, jobs, steps, and logs, including private repositories.',
    scopes: ['repo'],
  },
  {
    id: 'organizations',
    title: 'Organization list',
    detail: 'Find organizations you belong to when choosing a runner target.',
    scopes: ['read:org', 'write:org', 'admin:org'],
  },
];

const SCOPE_NAMES: Readonly<Record<string, string>> = {
  repo: 'Full access to repositories',
  'admin:org': 'Manage organizations, including self-hosted runners',
  'manage_runners:org': 'Manage organization self-hosted runners',
  'write:org': 'Read and write organization membership',
  'read:org': 'Read organization membership',
  workflow: 'Update GitHub Actions workflow files',
  gist: 'Create gists',
};

export function permissionsFor(scopes: readonly string[] | null): GitHubPermission[] {
  return RULES.map((rule) => {
    let state: PermissionState = 'missing';
    if (!scopes) state = 'unknown';
    else if (rule.scopes.some((scope) => scopes.includes(scope))) state = 'granted';
    return { ...rule, state };
  });
}

export function describeScope(scope: string) {
  return SCOPE_NAMES[scope] ?? 'Additional GitHub access';
}

export function hasOrganizationRunnerAccess(scopes: readonly string[]) {
  return scopes.includes('admin:org') || scopes.includes('manage_runners:org');
}
