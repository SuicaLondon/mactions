import { use } from 'react';

import { RunnerCreationContext } from '../context/runner-creation-context';

export function useRunnerCreationContext() {
  const creation = use(RunnerCreationContext);
  if (!creation) throw new Error('Runner creation state is only available inside CreateDialog.');
  return creation;
}
