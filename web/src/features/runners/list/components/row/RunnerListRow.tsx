import { memo } from 'react';

import { cn } from '../../../../../shared/lib/cn';
import { useRunnerInspectorStore } from '../../../inspector/stores/runner-inspector-store';
import { RunnerStatus } from '../../../shared/components/RunnerStatus';
import { rowFocusIndex } from '../../models/row-navigation';
import { runnerRowLayout } from '../../models/runner-grid-layout';
import type { DisplayRunner } from '../../models/runner-list';
import type { RunnerRowCallbacks, RunnerWorkState } from '../../models/runner-row';
import { runnerRowPresentation } from '../../models/runner-row-presentation';
import { RunnerRowActions } from './RunnerRowActions';
import { RunnerRowIdentity } from './RunnerRowIdentity';
import { RunnerRowLabels } from './RunnerRowLabels';
import { RunnerRowScope } from './RunnerRowScope';
import { RunnerWorkSummary } from './RunnerWorkSummary';

export interface RunnerListRowProps {
  row: DisplayRunner;
  selected: boolean;
  /** GitHub's first inventory answer is still pending. */
  checkingGitHub: boolean;
  work: RunnerWorkState;
  callbacks: RunnerRowCallbacks;
}

export const RunnerListRow = memo(function RunnerListRow({
  row,
  selected,
  checkingGitHub,
  work,
  callbacks: { onOpen, onMenu, onDetails },
}: RunnerListRowProps) {
  const view = runnerRowPresentation(row, checkingGitHub);
  const followDetails = useRunnerInspectorStore((state) => state.followDetails);
  return (
    <div
      className={cn(runnerRowLayout, 'aria-selected:bg-accent/8 aria-selected:hover:bg-accent/8')}
      role="row"
      data-id={row.localId}
      data-row-focus
      tabIndex={0}
      aria-label={`${row.name}, ${view.state.text}, ${view.deviceLabel}`}
      title={`Open runs for ${row.name}`}
      aria-selected={selected}
      onClick={() => onOpen(row)}
      // An open details panel follows j/k and arrow-key focus; a closed one stays closed.
      onFocus={(event) => {
        if (event.target === event.currentTarget) followDetails(row);
      }}
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
          return;
        }
        const items = [
          ...event.currentTarget.parentElement!.querySelectorAll<HTMLElement>(
            ':scope > [data-row-focus]',
          ),
        ];
        const next = rowFocusIndex(event.key, items.indexOf(event.currentTarget), items.length);
        if (next !== undefined) {
          event.preventDefault();
          items[next]?.focus();
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
      <RunnerRowIdentity name={row.name} deviceLabel={view.deviceLabel} readOnly={!row.local} />
      <RunnerRowScope target={view.target} scopeLabel={view.scopeLabel} />
      <div
        className={cn(
          '@max-3xl:col-start-3 @max-3xl:col-end-auto',
          '@max-3xl:row-start-1 @max-3xl:row-end-3 @max-md:col-start-2 @max-md:col-end-auto',
          '@max-md:row-start-1 @max-md:row-end-auto',
          'min-w-0',
        )}
        role="gridcell"
      >
        <RunnerStatus
          label={view.statusLabel}
          title={view.statusTitle}
          state={view.state.style}
          className="p-0 leading-4.5 font-medium"
        />
      </div>
      <RunnerRowLabels
        labels={row.labels}
        checking={view.checkingLabels}
        title={view.labelsTitle}
      />
      <div
        className={cn(
          '@max-3xl:col-start-2 @max-3xl:col-end-auto @max-3xl:row-start-2',
          '@max-3xl:row-end-auto @max-md:col-start-2 @max-md:col-end-4 @max-md:row-start-2',
          '@max-md:row-end-auto',
          'min-w-0',
        )}
        role="gridcell"
      >
        <RunnerWorkSummary
          work={work}
          githubId={row.githubId}
          busy={row.local?.busy ?? row.remote?.busy ?? null}
        />
      </div>
      <RunnerRowActions
        name={row.name}
        onOpen={() => onOpen(row)}
        onDetails={() => onDetails(row)}
      />
    </div>
  );
});
