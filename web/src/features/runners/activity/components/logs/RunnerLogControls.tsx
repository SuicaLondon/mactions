import type { LogSnapshot } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { SelectControl } from '../../../../../shared/ui/controls/select/components/SelectControl';
import { UpdateFailedIndicator } from '../../../../../shared/ui/feedback/components/UpdateFailedIndicator';
import { ChevronIcon } from '../../../../../shared/ui/icons/ChevronIcon';
import { PauseIcon } from '../../../../../shared/ui/icons/PauseIcon';
import { PlayIcon } from '../../../../../shared/ui/icons/PlayIcon';
import { WrapIcon } from '../../../../../shared/ui/icons/WrapIcon';
import type { RunnerActivityLayout } from '../../models/runner-activity';
import { runnerLogFileOptions, type RunnerLogView } from '../../models/runner-log-view';
import { LogToggle } from './LogToggle';

// The page sets the controls in a toolbar joined to the output below.
const controlsClasses: Record<RunnerActivityLayout, string> = {
  panel: 'mb-3 gap-2 px-2',
  page: 'shrink-0 gap-1.5 rounded-t-md border border-b-0 border-line bg-toolbar p-2',
};

const fileClasses: Record<RunnerActivityLayout, string> = {
  panel: '',
  page: '@max-2xl/activity-main:basis-full',
};

const fileSelectClasses: Record<RunnerActivityLayout, string> = {
  panel: '',
  page: '@max-2xl/activity-main:max-w-none',
};

// The panel's plain buttons mark live updates in the success color; the page tints every toggle.
const liveToggleClasses: Record<RunnerActivityLayout, string> = {
  panel: 'aria-pressed:text-activity-success',
  page: '',
};

interface RunnerLogControlsProps {
  layout: RunnerActivityLayout;
  /** The runner's log files; unknown until logs first load. */
  files: LogSnapshot['files'] | undefined;
  /** A failed live poll while the last output stays on screen. */
  refreshError: Error | null;
  retrying: boolean;
  onRetry: () => void;
  view: RunnerLogView;
  onViewChange: (change: Partial<RunnerLogView>) => void;
}

export function RunnerLogControls({
  layout,
  files,
  refreshError,
  retrying,
  onRetry,
  view,
  onViewChange,
}: RunnerLogControlsProps) {
  const { file, live, follow, wrap } = view;
  let LiveUpdatesIcon = PlayIcon;
  let liveAction = 'Resume live updates';
  let liveLabel = 'Updates paused';
  if (live) {
    LiveUpdatesIcon = PauseIcon;
    liveAction = 'Pause live updates';
    liveLabel = 'Live updates';
  }
  return (
    <div className={cn('flex flex-wrap items-center text-xs text-muted', controlsClasses[layout])}>
      <div
        className={cn(
          'flex min-w-0 flex-1 items-center gap-1.75 text-xs text-muted',
          fileClasses[layout],
        )}
      >
        <span>Log file</span>
        <SelectControl
          id="log-file"
          label="Log file"
          className={cn('relative flex max-w-90 min-w-0 flex-1', fileSelectClasses[layout])}
          variant="toolbar"
          value={file}
          onChange={(value) => onViewChange({ file: value })}
          options={runnerLogFileOptions(files)}
        />
      </div>
      {/* Reserved even without an error, so a failed live poll never moves the controls. */}
      <UpdateFailedIndicator error={refreshError} retrying={retrying} onRetry={onRetry} />
      <LogToggle
        layout={layout}
        label={liveAction}
        pressed={live}
        icon={LiveUpdatesIcon}
        iconClassName="size-3"
        className={liveToggleClasses[layout]}
        onToggle={() => onViewChange({ live: !live })}
      >
        {liveLabel}
      </LogToggle>
      <LogToggle
        layout={layout}
        label="Follow output"
        pressed={follow}
        icon={ChevronIcon}
        iconClassName="rotate-90"
        onToggle={() => onViewChange({ follow: !follow })}
      >
        Follow output
      </LogToggle>
      <LogToggle
        layout={layout}
        label="Wrap lines"
        pressed={wrap}
        icon={WrapIcon}
        onToggle={() => onViewChange({ wrap: !wrap })}
      >
        Wrap lines
      </LogToggle>
    </div>
  );
}
