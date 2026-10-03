import type { Runner } from '../../../../shared/api/types';
import { cn } from '../../../../shared/lib/cn';
import { useRunnerActivity } from '../hooks/use-runner-activity';
import { RunnerActivityContent } from './RunnerActivityContent';
import { RunnerActivityHeader } from './RunnerActivityHeader';

interface RunnerActivityProps {
  runner: Runner;
  connected: boolean;
  logsOnly?: boolean;
}

export function RunnerActivity({ runner, connected, logsOnly = false }: RunnerActivityProps) {
  const activity = useRunnerActivity(runner, connected, logsOnly);
  return (
    <section
      className={cn(
        'runner-activity max-h-1/2 min-h-55 shrink-0 overflow-y-auto border-t',
        'border-t-line px-5 py-3 text-xs max-md:max-h-none',
        {
          'runner-diagnostics flex max-h-none min-h-0 flex-1 flex-col overflow-hidden': logsOnly,
          'border-t-0 p-0': logsOnly,
        },
      )}
      aria-label={`Activity for ${runner.name}`}
    >
      <RunnerActivityHeader
        logsOnly={logsOnly}
        tab={activity.tab}
        logsTitle={activity.logsTitle}
        runner={runner}
        setTab={activity.setTab}
        connected={connected}
        jobs={activity.jobs}
      />
      <RunnerActivityContent
        runner={runner}
        connected={connected}
        logsOnly={logsOnly}
        activity={activity}
      />
    </section>
  );
}
