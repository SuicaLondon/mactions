import { type Connection } from '../../../../shared/api/types';
import { AccountPermissions } from './AccountPermissions';
import { GitHubAccountCard } from './GitHubAccountCard';
import { GitHubScopeList } from './GitHubScopeList';

export function GitHubAccountPanel({ connection }: { connection: Connection }) {
  const scopes = connection.scopes;
  return (
    <div className="flex flex-col gap-5">
      <GitHubAccountCard connection={connection} />
      <section className="flex flex-col gap-3" aria-labelledby="github-permissions-heading">
        <h3 id="github-permissions-heading" className="m-0 text-xs font-semibold">
          Permissions
        </h3>
        <AccountPermissions scopes={scopes} />
      </section>
      <section className="flex flex-col gap-2" aria-labelledby="github-scopes-heading">
        <h3 id="github-scopes-heading" className="m-0 text-xs font-semibold">
          Token scopes
        </h3>
        <GitHubScopeList scopes={scopes} />
      </section>
    </div>
  );
}
