export interface RunnerDataAlert {
  label: string;
  error: Error;
}

/** The header alert for failed GitHub inventory or work, or null when both are healthy. */
export function runnerDataAlert(
  inventoryError: Error | null,
  workError: Error | null,
): RunnerDataAlert | null {
  if (inventoryError && workError)
    return {
      label: 'GitHub data unavailable',
      error: new Error(`${inventoryError.message}\nCurrent work: ${workError.message}`),
    };
  if (inventoryError) return { label: 'GitHub runners unavailable', error: inventoryError };
  if (workError) return { label: 'Current work unavailable', error: workError };
  return null;
}
