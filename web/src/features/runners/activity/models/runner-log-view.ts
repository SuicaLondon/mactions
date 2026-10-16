import type { LogSnapshot } from '../../../../shared/api/types';

/** The reader's choices for the runner log panel; `file` and `live` also shape the logs query. */
export interface RunnerLogView {
  /** Empty selects the latest runner log. */
  file: string;
  live: boolean;
  follow: boolean;
  wrap: boolean;
}

export const defaultRunnerLogView: RunnerLogView = {
  file: '',
  live: true,
  follow: true,
  wrap: true,
};

/** The latest runner log, then each file the runner offers; none are known before logs load. */
export function runnerLogFileOptions(files: LogSnapshot['files'] = []) {
  return [
    { value: '', label: 'Latest runner log' },
    ...files.map((item) => ({ value: item.name, label: item.name })),
  ];
}
