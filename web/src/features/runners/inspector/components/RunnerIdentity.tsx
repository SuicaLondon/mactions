import type { ReactNode } from 'react';

import type { Action, Runner } from '../../../../shared/api/types';
import { PendingLabel } from '../../../../shared/ui/controls/buttons/PendingLabel';
import { PlayIcon } from '../../../../shared/ui/icons/PlayIcon';
import { RefreshIcon } from '../../../../shared/ui/icons/RefreshIcon';
import { StopIcon } from '../../../../shared/ui/icons/StopIcon';
import { RunnerStatus } from '../../shared/components/RunnerStatus';
import { isUnregistered, statusFor } from '../../shared/models/runner-model';

interface RunnerIdentityProps {
  runner: Runner;
  locked: boolean;
  /** The runner action in progress for this runner, if any; its progress stays inside its button. */
  pendingAction: string | null;
  onAction: (action: Action) => void;
  /** The reserved notice under the controls. */
  children: ReactNode;
}

/** The runner's name and status, with Start or Stop and Restart. */
export function RunnerIdentity({
  runner,
  locked,
  pendingAction,
  onAction,
  children,
}: RunnerIdentityProps) {
  const status = statusFor(runner);
  const unregistered = isUnregistered(runner);
  let action: 'start' | 'stop' = 'stop';
  let ActionIcon = StopIcon;
  let actionLabel = 'Stop';
  if (runner.local_status === 'stopped') {
    action = 'start';
    ActionIcon = PlayIcon;
    actionLabel = 'Start';
  }
  const pending = pendingAction === action;
  const restarting = pendingAction === 'restart';
  return (
    <div className="mx-0 mb-1.5 p-4.5 pt-5.75 pb-4.5 text-left max-md:p-4.5">
      <h3 className="mt-0 text-xs font-semibold wrap-anywhere">{runner.name}</h3>
      <RunnerStatus label={status.text} state={status.style} />
      <div className="mt-4 flex justify-start gap-1.75">
        <button
          disabled={!pending && (locked || (action === 'start' && unregistered))}
          aria-disabled={pending || undefined}
          aria-busy={pending || undefined}
          onClick={() => {
            if (!pending) onAction(action);
          }}
          className="min-w-21.5 text-xs"
        >
          <PendingLabel
            pending={pending}
            idle={
              <span className="inline-flex items-center gap-1.5">
                <ActionIcon className="size-3.25" />
                {actionLabel}
              </span>
            }
            busy={actionLabel}
          />
        </button>
        <button
          disabled={!restarting && (locked || unregistered)}
          aria-disabled={restarting || undefined}
          aria-busy={restarting || undefined}
          onClick={() => {
            if (!restarting) onAction('restart');
          }}
          className="min-w-21.5 text-xs"
        >
          <PendingLabel
            pending={restarting}
            idle={
              <span className="inline-flex items-center gap-1.5">
                <RefreshIcon className="size-3.25" />
                Restart
              </span>
            }
            busy="Restart"
          />
        </button>
      </div>
      {children}
    </div>
  );
}
