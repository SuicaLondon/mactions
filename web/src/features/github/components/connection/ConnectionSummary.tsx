import { cn } from '../../../../shared/lib/cn';
import type { GitHubAuthState } from '../../types/github-auth';
import { ConnectionSummaryLabel } from './ConnectionSummaryLabel';

export function ConnectionSummary({
  welcome,
  connection,
  summary,
  setExpanded,
  showContent,
  setDismissed,
  settingsLabel,
  checkAgain,
}: {
  welcome: boolean;
  connection: GitHubAuthState['connection'];
  summary: string;
  setExpanded: GitHubAuthState['setExpanded'];
  showContent: GitHubAuthState['showContent'];
  setDismissed: GitHubAuthState['setDismissed'];
  settingsLabel: 'Connection settings' | 'Connect GitHub';
  checkAgain: GitHubAuthState['checkAgain'];
}) {
  let toggleLabel: string = settingsLabel;
  if (showContent) toggleLabel = 'Hide';
  return (
    <div
      className={cn('connection-summary flex flex-wrap items-center gap-3', {
        'gap-x-3 gap-y-2': welcome,
      })}
    >
      <span
        className={cn('connection-dot size-1.75 shrink-0 rounded-full bg-muted', {
          'bg-green-500': connection.data?.connected,
        })}
      />
      <span>
        <ConnectionSummaryLabel connection={connection} summary={summary} />
      </span>
      <button
        type="button"
        className="min-h-5.5 border-0 bg-transparent p-0 text-xs text-accent shadow-none"
        onClick={() => {
          setExpanded(!showContent);
          setDismissed(showContent);
        }}
        aria-expanded={Boolean(showContent)}
      >
        {toggleLabel}
      </button>
      <button
        type="button"
        className="min-h-5.5 border-0 bg-transparent p-0 text-xs text-accent shadow-none"
        disabled={connection.isFetching}
        onClick={checkAgain}
      >
        Check again
      </button>
    </div>
  );
}
