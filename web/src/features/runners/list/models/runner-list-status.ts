/** GitHub's connection as the runner list knows it; `checking` until the first check answers. */
export type GitHubConnectionState = 'checking' | 'connected' | 'disconnected';

export interface InventoryProgress {
  /** Any inventory page, fresh or cached, is available. */
  hasInventory: boolean;
  inventoryPending: boolean;
  connection: GitHubConnectionState;
}

/** GitHub's first inventory answer is still pending; cached inventory stays on screen while it refetches. */
export function isCheckingGitHub({
  hasInventory,
  inventoryPending,
  connection,
}: InventoryProgress) {
  return (
    !hasInventory && (connection === 'checking' || (connection === 'connected' && inventoryPending))
  );
}

export function runnerEmptyTitle(rowCount: number, localError: string | undefined) {
  if (rowCount) return 'No Matching Runners';
  if (localError) return 'Unable to load runners';
  return 'No Runners';
}

export function runnerEmptyDescription(rowCount: number, localError: string | undefined) {
  if (rowCount) return 'Try another search, status or device filter.';
  return localError || 'Add a runner or choose another organization or repository.';
}
