import type { Runner } from '../../../../shared/api/types';
import { cn } from '../../../../shared/lib/cn';
import { RefreshButton } from '../../../../shared/ui/controls/buttons/RefreshButton';
import { PlayIcon } from '../../../../shared/ui/icons/playback/PlayIcon';
import { TerminalIcon } from '../../../../shared/ui/icons/system/TerminalIcon';
import type { RunnerActivityState } from '../models/runner-activity';

export function RunnerActivityHeader({
  logsOnly,
  tab,
  logsTitle,
  runner,
  setTab,
  connected,
  jobs,
}: {
  logsOnly: boolean;
  tab: RunnerActivityState['tab'];
  logsTitle: RunnerActivityState['logsTitle'];
  runner: Runner;
  setTab: RunnerActivityState['setTab'];
  connected: boolean;
  jobs: RunnerActivityState['jobs'];
}) {
  let ActivityIcon = PlayIcon;
  let title = 'Workflow jobs';
  if (tab === 'logs') {
    ActivityIcon = TerminalIcon;
    title = logsTitle;
  }
  return (
    <div
      className={cn(
        'activity-header mx-0 mb-3.5 flex min-h-7 shrink-0 items-center justify-start',
        'gap-3.5 border-b border-b-line pb-3 max-md:flex-wrap max-md:gap-2.5',
        {
          'mt-0 shrink-0 border-0 p-0': logsOnly,
        },
      )}
    >
      <div
        className={cn('activity-identity mx-0 mr-auto mb-0.75 flex min-w-0 items-center gap-2.5', {
          'items-center': logsOnly,
        })}
      >
        <span
          className={cn(
            'activity-icon grid size-8 place-items-center rounded-lg border border-line',
            'bg-canvas text-muted',
            {
              hidden: logsOnly,
            },
          )}
        >
          <ActivityIcon />
        </span>
        <div
          className={cn({
            'flex items-baseline gap-2.5 @max-2xl/activity-main:flex-wrap': logsOnly,
            '@max-2xl/activity-main:gap-x-2.5 @max-2xl/activity-main:gap-y-0.75': logsOnly,
          })}
        >
          <h2
            className={cn('mt-0 text-xs font-semibold', {
              'm-0 text-base font-semibold': logsOnly,
            })}
          >
            {title}
          </h2>
          <span
            className={cn(
              'activity-runner m-0 ml-2 inline-block text-xs font-normal wrap-anywhere',
              'text-muted',
              {
                'm-0 text-xs text-muted': logsOnly,
              },
            )}
          >
            {runner.name}
          </span>
        </div>
      </div>
      {!logsOnly && (
        <div
          className={cn(
            'segments inline-flex shrink-0 gap-0.5 rounded-lg border border-zinc-500/5',
            'bg-zinc-500/9 p-0.5 px-2.75 max-md:w-full dark:bg-black/16',
          )}
          role="group"
          aria-label="Runner activity view"
        >
          {(
            [
              { value: 'jobs', label: 'Jobs' },
              { value: 'logs', label: 'Logs' },
            ] as const
          ).map(({ value, label }) => (
            <button
              key={value}
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                'min-h-6 rounded-md bg-transparent py-0.75 text-xs text-muted shadow-none',
                'border-0 aria-pressed:font-medium aria-pressed:text-foreground',
                'aria-pressed:bg-accent/10 aria-pressed:shadow-none max-md:flex-1 max-md:py-1',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {!!(tab === 'jobs' && connected) && (
        <RefreshButton
          className="min-h-6 border-0 bg-transparent p-0 text-xs text-accent shadow-none"
          label="Refresh jobs"
          disabled={jobs.isFetching}
          onClick={() => void jobs.refetch()}
        />
      )}
    </div>
  );
}
