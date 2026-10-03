import type { Action, Runner } from '../../../../../shared/api/types';

interface RunnerRecoveryNoteProps {
  runner: Runner;
  locked: boolean;
  onAction: (runner: Runner, action: Action) => void;
}
export function RunnerRecoveryNote({ runner: r, locked, onAction }: RunnerRecoveryNoteProps) {
  if (!r.interrupted && (r.github_id || r.deregistered)) return null;
  let recoveryMessage = 'Setup is incomplete.';
  if (r.interrupted) recoveryMessage = 'An operation was interrupted. Retry the intended action.';
  return (
    <div className="recovery-note px-4.5 pt-0 pb-3.5">
      <p className="text-xs leading-normal text-muted">{recoveryMessage}</p>
      {!!(!r.github_id && !r.deregistered) && (
        <button disabled={locked} onClick={() => onAction(r, 'retry')} className="text-xs">
          Resume Setup
        </button>
      )}
    </div>
  );
}
