import { cn } from '../../../../shared/lib/cn';
import { PlayIcon } from '../../../../shared/ui/icons/PlayIcon';
import { TerminalIcon } from '../../../../shared/ui/icons/TerminalIcon';
import type { RunnerActivityLayout, RunnerActivityTab } from '../models/runner-activity';

// The page sets the title in headline size beside the runner name, without the panel's icon.
const headingClasses: Record<RunnerActivityLayout, string> = {
  panel: '',
  page: cn(
    'flex items-baseline gap-2.5 @max-2xl/activity-main:flex-wrap',
    '@max-2xl/activity-main:gap-y-0.75',
  ),
};

const titleClasses: Record<RunnerActivityLayout, string> = {
  panel: 'text-xs',
  page: 'text-base',
};

const runnerNameClasses: Record<RunnerActivityLayout, string> = {
  panel: 'ml-2',
  page: '',
};

interface RunnerActivityIdentityProps {
  layout: RunnerActivityLayout;
  /** Picks the panel's icon. */
  tab: RunnerActivityTab;
  title: string;
  runnerName: string;
}

export function RunnerActivityIdentity({
  layout,
  tab,
  title,
  runnerName,
}: RunnerActivityIdentityProps) {
  let ActivityIcon = PlayIcon;
  if (tab === 'logs') ActivityIcon = TerminalIcon;
  return (
    <div className="mx-0 mr-auto mb-0.75 flex min-w-0 items-center gap-2.5">
      {layout === 'panel' && (
        <span
          className={cn(
            'grid size-8 place-items-center rounded-lg border border-line',
            'bg-canvas text-muted',
          )}
        >
          <ActivityIcon />
        </span>
      )}
      <div className={headingClasses[layout]}>
        <h2 className={cn('m-0 font-semibold', titleClasses[layout])}>{title}</h2>
        <span
          className={cn(
            'm-0 inline-block text-xs font-normal wrap-anywhere text-muted',
            runnerNameClasses[layout],
          )}
        >
          {runnerName}
        </span>
      </div>
    </div>
  );
}
