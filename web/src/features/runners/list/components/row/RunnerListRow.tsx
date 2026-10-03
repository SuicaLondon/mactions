import { memo } from 'react';

import { cn } from '../../../../../shared/lib/cn';
import { runnerRowLayout } from '../../../../../shared/ui/layout/list-layout';
import { RunnerStatus } from '../../../shared/components/RunnerStatus';
import { statusFor } from '../../../shared/models/runner-model';
import { deviceLabels, type RunnerListRowProps } from '../../models/runner-row';
import { RunnerWorkSummary } from '../work/RunnerWorkSummary';
import { RunnerRowActions } from './RunnerRowActions';
import { RunnerRowIdentity } from './RunnerRowIdentity';
import { RunnerRowLabels } from './RunnerRowLabels';
import { RunnerRowScope } from './RunnerRowScope';

export const RunnerListRow = memo(function RunnerListRow({
  row,
  selected,
  runs,
  loadingWork,
  connected,
  unavailableWork,
  onOpen,
  onMenu,
  onDetails,
}: RunnerListRowProps) {
  const target = row.local?.target ?? row.remote?.target;
  let state;
  if (row.local) state = statusFor(row.local);
  else {
    let text = row.remote?.status ?? 'Unknown';
    let style = '';
    if (row.remote?.busy) text = 'Busy';
    else if (row.remote?.status === 'online') text = 'Idle';
    if (row.remote?.status === 'online') {
      style = 'online';
      if (row.remote.busy) style = 'busy';
    }
    state = { text, style };
  }
  const deviceLabel = deviceLabels[row.device];
  let scopeLabel = 'Repository';
  if (target?.kind === 'org') scopeLabel = 'Organization';
  if (row.scopeUnconfirmed) scopeLabel = 'Repository access unconfirmed';
  return (
    <div
      className={cn(runnerRowLayout, {
        'showing-details': selected,
      })}
      role="row"
      data-id={row.localId}
      tabIndex={0}
      aria-label={`${row.name}, ${state.text}, ${deviceLabel}`}
      aria-selected={selected}
      onClick={() => onOpen(row)}
      onContextMenu={(event) => {
        if (!row.local) return;
        event.preventDefault();
        event.currentTarget.focus();
        onMenu(row.local, event.clientX, event.clientY);
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (['Enter', ' '].includes(event.key)) {
          event.preventDefault();
          onOpen(row);
        } else if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const items = [
            ...event.currentTarget.parentElement!.querySelectorAll<HTMLElement>('.runner-grid-row'),
          ];
          const index = items.indexOf(event.currentTarget);
          let nextIndex;
          if (event.key === 'Home') nextIndex = 0;
          else if (event.key === 'End') nextIndex = items.length - 1;
          else {
            let direction = -1;
            if (event.key === 'ArrowDown') direction = 1;
            nextIndex = Math.max(0, Math.min(items.length - 1, index + direction));
          }
          items[nextIndex]?.focus();
        } else if (
          row.local &&
          (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))
        ) {
          event.preventDefault();
          const box = event.currentTarget.getBoundingClientRect();
          onMenu(row.local, box.left + 24, box.bottom);
        }
      }}
    >
      <RunnerRowIdentity row={row} deviceLabel={deviceLabel} />
      <RunnerRowScope target={target} scopeLabel={scopeLabel} />
      <div
        className={cn(
          cn(
            'runner-grid-status @max-3xl:col-start-3 @max-3xl:col-end-auto',
            '@max-3xl:row-start-1 @max-3xl:row-end-3 @max-md:col-start-2 @max-md:col-end-auto',
            '@max-md:row-start-1 @max-md:row-end-auto',
          ),
          'min-w-0',
        )}
        role="gridcell"
      >
        <RunnerStatus
          label={state.text}
          state={state.style}
          className="p-0 leading-4.5 font-medium"
        />
      </div>
      <div
        className="runner-grid-labels flex min-w-0 items-center gap-1.25 @max-5xl:hidden"
        role="gridcell"
        title={row.labels.join(', ')}
      >
        <RunnerRowLabels row={row} />
      </div>
      <div
        className={cn(
          cn(
            'runner-grid-work @max-3xl:col-start-2 @max-3xl:col-end-auto @max-3xl:row-start-2',
            '@max-3xl:row-end-auto @max-md:col-start-2 @max-md:col-end-4 @max-md:row-start-2',
            '@max-md:row-end-auto',
          ),
          'min-w-0',
        )}
        role="gridcell"
      >
        <RunnerWorkSummary
          runs={runs}
          githubId={row.githubId}
          loading={loadingWork}
          connected={connected}
          unavailable={unavailableWork}
          busy={row.local?.busy ?? row.remote?.busy ?? null}
        />
      </div>
      <RunnerRowActions row={row} onDetails={onDetails} />
    </div>
  );
});
