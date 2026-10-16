import { type Connection } from '../../../../shared/api/types';
import { AccountAvatar } from './AccountAvatar';

export function GitHubAccountCard({ connection }: { connection: Connection }) {
  const login = connection.login ?? '';
  let displayName = `@${login}`;
  if (connection.name) displayName = connection.name;
  return (
    <section className="flex min-w-0 items-center gap-3.5" aria-label="Connected GitHub account">
      <AccountAvatar url={connection.avatar_url} login={login} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <strong className="truncate text-xs font-semibold">{displayName}</strong>
        <a
          className="w-fit truncate text-xs text-accent"
          href={`https://github.com/${login}`}
          target="_blank"
          rel="noreferrer"
        >
          @{login}
        </a>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span
            className="size-1.75 shrink-0 rounded-full bg-activity-success"
            aria-hidden="true"
          />
          Connected through GitHub CLI on this Mac
        </span>
      </div>
    </section>
  );
}
