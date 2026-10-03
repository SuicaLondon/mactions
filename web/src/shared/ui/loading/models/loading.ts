export type LoadingKind =
  | 'runners'
  | 'runs'
  | 'run'
  | 'job'
  | 'history'
  | 'logs'
  | 'runner-logs'
  | 'graph'
  | 'access'
  | 'steps'
  | 'toolbar'
  | 'step'
  | 'history-steps';

export const labels: Record<LoadingKind, string> = {
  runners: 'Loading runners…',
  runs: 'Loading runs…',
  run: 'Loading jobs…',
  job: 'Loading job steps…',
  history: 'Loading job history…',
  logs: 'Loading log output…',
  'runner-logs': 'Loading runner logs…',
  graph: 'Loading workflow dependencies…',
  access: 'Checking GitHub access…',
  steps: 'Loading steps…',
  toolbar: 'Loading filters…',
  step: 'Loading step output…',
  'history-steps': 'Loading historical steps…',
};

export const placeholderClasses: Record<LoadingKind, string> = {
  runners: 'loading-placeholder-runners',
  runs: 'loading-placeholder-runs',
  run: 'loading-placeholder-run',
  job: 'loading-placeholder-job',
  history: 'loading-placeholder-history',
  logs: 'loading-placeholder-logs',
  'runner-logs': 'loading-placeholder-runner-logs',
  graph: 'loading-placeholder-graph',
  access: 'loading-placeholder-access',
  steps: 'loading-placeholder-steps',
  toolbar: 'loading-placeholder-toolbar',
  step: 'loading-placeholder-step',
  'history-steps': 'loading-placeholder-history-steps',
};
