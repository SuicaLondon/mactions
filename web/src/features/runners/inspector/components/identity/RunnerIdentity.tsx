import type { Action, Runner } from '../../../../../shared/api/types';
import { RefreshIcon } from '../../../../../shared/ui/icons/actions/RefreshIcon';
import { PlayIcon } from '../../../../../shared/ui/icons/playback/PlayIcon';
import { StopIcon } from '../../../../../shared/ui/icons/playback/StopIcon';
import { RunnerStatus } from '../../../shared/components/RunnerStatus';
import { statusFor } from '../../../shared/models/runner-model';

export function RunnerIdentity({
  r,
  locked,
  action,
  unregistered,
  onAction,
}: {
  r: Runner;
  locked: boolean;
  action: 'start' | 'stop';
  unregistered: boolean;
  onAction: (runner: Runner, action: Action) => void;
}) {
  let RunnerActionIcon = StopIcon;
  let actionLabel = 'Stop';
  if (action === 'start') {
    RunnerActionIcon = PlayIcon;
    actionLabel = 'Start';
  }
  return (
    <div className="identity mx-0 mb-1.5 px-4.5 py-4.5 pt-5.75 pb-4.5 text-left max-md:p-4.5">
      <h3 className="mt-0 text-sm font-semibold wrap-anywhere">{r.name}</h3>
      <RunnerStatus label={statusFor(r).text} state={statusFor(r).style} />
      <div className="runner-controls mt-4 flex justify-start gap-1.75">
        <button
          disabled={locked || (action === 'start' && unregistered)}
          onClick={() => onAction(r, action)}
          className="min-w-21.5 text-xs"
        >
          <RunnerActionIcon className="size-3.25" />
          {actionLabel}
        </button>
        <button
          disabled={locked || unregistered}
          onClick={() => onAction(r, 'restart')}
          className="min-w-21.5 text-xs"
        >
          <RefreshIcon className="size-3.25" />
          Restart
        </button>
      </div>
    </div>
  );
}
