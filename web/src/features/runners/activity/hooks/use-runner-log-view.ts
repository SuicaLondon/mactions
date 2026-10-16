import { useState } from 'react';

import { defaultRunnerLogView, type RunnerLogView } from '../models/runner-log-view';

export function useRunnerLogView() {
  const [view, setView] = useState<RunnerLogView>(defaultRunnerLogView);
  function changeView(change: Partial<RunnerLogView>) {
    setView((current) => ({ ...current, ...change }));
  }
  return { view, changeView };
}
