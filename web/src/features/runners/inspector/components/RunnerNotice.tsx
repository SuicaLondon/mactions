import type { Action, Runner } from '../../../../shared/api/types';
import { cn } from '../../../../shared/lib/cn';
import { linkButtonClassName } from '../../../../shared/ui/controls/buttons/link-button-class';
import { ClampedMessage } from '../../../../shared/ui/feedback/components/ClampedMessage';

interface RunnerNoticeProps {
  runner: Runner;
  /** GitHub errors are reported only while GitHub is connected. */
  connected: boolean;
  locked: boolean;
  onAction: (action: Action) => void;
}

/**
 * Two lines under the runner controls, always reserved, for an interrupted or incomplete setup and
 * runner errors. A failed action or refresh fills them in place, so the sections below never move.
 * Long errors clamp, with a Details link to the full text.
 */
export function RunnerNotice({ runner, connected, locked, onAction }: RunnerNoticeProps) {
  const incomplete = !runner.github_id && !runner.deregistered;
  let recovery: string | null = null;
  if (runner.interrupted) recovery = 'An operation was interrupted. Retry the intended action.';
  else if (incomplete) recovery = 'Setup is incomplete.';
  let githubError: string | undefined;
  if (connected) githubError = runner.github_error;
  const errors = [runner.error, githubError, runner.local_error].filter((error): error is string =>
    Boolean(error),
  );
  let errorText = '';
  if (errors.length) errorText = `${errors.join(' ')} Runner diagnostic logs have more detail.`;
  return (
    <ClampedMessage className="mt-3">
      {!!recovery && (
        <span className="text-muted">
          {recovery}{' '}
          {incomplete && (
            <button
              type="button"
              className={cn(linkButtonClassName, 'min-h-0')}
              disabled={locked}
              onClick={() => onAction('retry')}
            >
              Resume setup
            </button>
          )}{' '}
        </span>
      )}
      {!!errorText && (
        <span role="alert" className="wrap-anywhere text-danger">
          {errorText}
        </span>
      )}
    </ClampedMessage>
  );
}
