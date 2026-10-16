import type { Runner } from '../../../../shared/api/types';

export type RunnerActivityTab = 'logs' | 'jobs';

/** A panel below other content, or a full page of diagnostic logs. */
export type RunnerActivityLayout = 'panel' | 'page';

/** Opens a busy runner on its jobs; diagnostics-only views always open on logs. */
export function initialRunnerActivityTab(runner: Runner, logsOnly: boolean): RunnerActivityTab {
  if (!logsOnly && runner.busy) return 'jobs';
  return 'logs';
}

export function runnerActivityTitle(tab: RunnerActivityTab, logsOnly: boolean) {
  if (tab === 'jobs') return 'Workflow jobs';
  if (logsOnly) return 'Runner diagnostic logs';
  return 'Runner output';
}
