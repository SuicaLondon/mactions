import { hasOrganizationRunnerAccess, permissionsFor } from '../../models/github-permissions';
import { GitHubPermissionList } from './GitHubPermissionList';
import { OrganizationAccessGrant } from './OrganizationAccessGrant';

/** What the login's scopes allow, with the organization access grant when it is missing. */
export function AccountPermissions({ scopes }: { scopes: string[] | null | undefined }) {
  if (!scopes) {
    // Fine-grained tokens report no scopes; the rows stay, marked as checked per target.
    return (
      <>
        <GitHubPermissionList permissions={permissionsFor(null)} />
        <p className="m-0 text-xs/relaxed text-muted">
          This login does not report its scopes, so GitHub checks each permission when you choose a
          runner target.
        </p>
      </>
    );
  }
  return (
    <>
      <GitHubPermissionList permissions={permissionsFor(scopes)} />
      {!hasOrganizationRunnerAccess(scopes) && <OrganizationAccessGrant />}
      <p className="m-0 text-xs/relaxed text-muted">
        Scopes allow access; GitHub still requires you to be an administrator of each repository or
        organization.
      </p>
    </>
  );
}
