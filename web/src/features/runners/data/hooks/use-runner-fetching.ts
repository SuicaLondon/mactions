import { useIsFetching } from '@tanstack/react-query';

import { RUNNERS_KEY } from './use-runner-snapshot';

export function useRunnerFetching() {
  return useIsFetching({ queryKey: RUNNERS_KEY }) > 0;
}
