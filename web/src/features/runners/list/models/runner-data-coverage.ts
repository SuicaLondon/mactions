export interface RunnerDataCoverage {
  inventoryMessage: string;
  workMessage: string;
  /** Present when either GitHub poll is slower than every 30 seconds. */
  refresh?: { inventorySeconds: number; workSeconds: number };
}

export interface RunnerDataCoverageInput {
  connected: boolean;
  inventoryMessage: string;
  workMessage: string | undefined;
  inventorySeconds: number;
  workSeconds: number;
}

/** Notes about GitHub data coverage, or null when there is nothing to note. */
export function runnerDataCoverage({
  connected,
  inventoryMessage,
  workMessage = '',
  inventorySeconds,
  workSeconds,
}: RunnerDataCoverageInput): RunnerDataCoverage | null {
  let refresh: RunnerDataCoverage['refresh'];
  if (connected && (inventorySeconds > 30 || workSeconds > 30))
    refresh = { inventorySeconds, workSeconds };
  if (!inventoryMessage && !workMessage && !refresh) return null;
  return { inventoryMessage, workMessage, refresh };
}
