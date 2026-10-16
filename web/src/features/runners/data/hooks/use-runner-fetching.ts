import { useIsFetching } from '@tanstack/react-query';

import { RUNNERS_KEY } from '../models/runner-snapshot-query';

export function useRunnerFetching() {
  return useIsFetching({ queryKey: RUNNERS_KEY }) > 0;
}
