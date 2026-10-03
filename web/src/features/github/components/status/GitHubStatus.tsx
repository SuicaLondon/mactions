import { cn } from '../../../../shared/lib/cn';
import { useConnection } from '../../hooks/connection/use-connection';
import { GitHubStatusContent } from './GitHubStatusContent';
import { GitHubStatusControl } from './GitHubStatusControl';

export function GitHubStatus({
  interactive = true,
  onOpen,
}: {
  interactive?: boolean;
  onOpen: () => void;
}) {
  const connection = useConnection();
  const unavailable = connection.isError || connection.data?.state === 'unavailable';
  let label = 'GitHub CLI · Not connected';
  if (connection.isPending) label = 'GitHub CLI · Checking…';
  else if (connection.data?.connected) label = `GitHub CLI · @${connection.data.login}`;
  else if (unavailable) label = 'GitHub CLI · Status unavailable';
  let title = 'Uses GitHub CLI on the Mac running mactions.';
  if (connection.data?.connected) {
    title = `Using @${connection.data.login} from GitHub CLI on this Mac. Open account settings.`;
  } else if (unavailable) {
    title = 'Unable to verify GitHub CLI status. Open settings to check again.';
  }
  const content = (
    <>
      <span
        className={cn('connection-dot size-1.75 shrink-0 rounded-full bg-muted', {
          'bg-green-500': connection.data?.connected,
        })}
        aria-hidden="true"
      />
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap max-sm:hidden">
        <GitHubStatusContent connection={connection} label={label} />
      </span>
    </>
  );
  return (
    <GitHubStatusControl
      interactive={interactive}
      connection={connection}
      title={title}
      onOpen={onOpen}
      content={content}
    />
  );
}
