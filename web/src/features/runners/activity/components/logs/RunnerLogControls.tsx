import { cn } from '../../../../../shared/lib/cn';
import { SelectControl } from '../../../../../shared/ui/controls/select/components/SelectControl';
import { WrapIcon } from '../../../../../shared/ui/icons/actions/WrapIcon';
import { ChevronIcon } from '../../../../../shared/ui/icons/navigation/ChevronIcon';
import { PauseIcon } from '../../../../../shared/ui/icons/playback/PauseIcon';
import { PlayIcon } from '../../../../../shared/ui/icons/playback/PlayIcon';
import type { RunnerActivityState } from '../../models/runner-activity';

interface RunnerLogControlsProps {
  logsOnly: boolean;
  activity: RunnerActivityState;
}

export function RunnerLogControls({ logsOnly, activity }: RunnerLogControlsProps) {
  const { file, setFile, logs, live, setLive, follow, setFollow, wrap, setWrap } = activity;
  let LiveUpdatesIcon = PlayIcon;
  let liveAction = 'Resume live updates';
  let liveLabel = 'Updates paused';
  if (live) {
    LiveUpdatesIcon = PauseIcon;
    liveAction = 'Pause live updates';
    liveLabel = 'Live updates';
  }
  return (
    <div
      className={cn('log-controls mb-3 flex flex-wrap items-center gap-2 px-2 text-xs text-muted', {
        'm-0 flex shrink-0 flex-wrap items-center gap-1.5 rounded-t-md border border-b-0': logsOnly,
        'border-line bg-toolbar p-2': logsOnly,
      })}
    >
      <div
        className={cn(
          'diagnostic-file-field flex min-w-0 flex-1 items-center gap-1.75 text-xs',
          'text-muted',
          {
            '@max-2xl/activity-main:basis-full': logsOnly,
          },
        )}
      >
        <span>Log file</span>
        <SelectControl
          id="log-file"
          label="Log file"
          className={cn('diagnostic-file-select relative flex max-w-90 min-w-0 flex-1', {
            '@max-2xl/activity-main:max-w-none': logsOnly,
          })}
          embedded={false}
          value={file}
          onChange={setFile}
          options={[
            { value: '', label: 'Latest runner log' },
            ...(logs.data?.files.map((item) => ({
              value: item.name,
              label: item.name,
            })) ?? []),
          ]}
        />
      </div>
      <button
        className={cn('log-live text-xs aria-pressed:text-activity-success', {
          'h-7.5 min-h-7.5 rounded-sm border border-control-border bg-surface py-1 text-xs':
            logsOnly,
          'whitespace-nowrap text-muted shadow-none aria-pressed:border-accent/40': logsOnly,
          'aria-pressed:bg-accent/10 aria-pressed:text-foreground': logsOnly,
        })}
        aria-label={liveAction}
        aria-pressed={live}
        onClick={() => setLive((v) => !v)}
      >
        <LiveUpdatesIcon
          className={cn('size-3', {
            'size-3.25': logsOnly,
          })}
        />
        {liveLabel}
      </button>
      <button
        className={cn('log-toggle text-xs', {
          'h-7.5 min-h-7.5 rounded-sm border border-control-border bg-surface py-1 text-xs':
            logsOnly,
          'whitespace-nowrap text-muted shadow-none aria-pressed:border-accent/40': logsOnly,
          'aria-pressed:bg-accent/10 aria-pressed:text-foreground': logsOnly,
        })}
        aria-label="Follow output"
        aria-pressed={follow}
        onClick={() => setFollow((value) => !value)}
      >
        <ChevronIcon
          className={cn('rotate-90', {
            'size-3.25': logsOnly,
          })}
        />
        Follow output
      </button>
      <button
        className={cn('log-toggle text-xs', {
          'h-7.5 min-h-7.5 rounded-sm border border-control-border bg-surface py-1 text-xs':
            logsOnly,
          'whitespace-nowrap text-muted shadow-none aria-pressed:border-accent/40': logsOnly,
          'aria-pressed:bg-accent/10 aria-pressed:text-foreground': logsOnly,
        })}
        aria-label="Wrap lines"
        aria-pressed={wrap}
        onClick={() => setWrap((value) => !value)}
      >
        <WrapIcon
          className={cn({
            'size-3.25': logsOnly,
          })}
        />
        Wrap lines
      </button>
    </div>
  );
}
