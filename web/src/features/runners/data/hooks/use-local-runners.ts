import type { Runner, Snapshot } from '../../../../shared/api/types';
import { useRunnerSnapshot } from './use-runner-snapshot';

const NO_RUNNERS: Runner[] = [];
const selectRunners = (snapshot: Snapshot) => snapshot.runners;

/** The runners on this Mac, empty until the first snapshot arrives. */
export function useLocalRunners() {
  return useRunnerSnapshot(selectRunners) ?? NO_RUNNERS;
}
