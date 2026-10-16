/** A loaded view's background refresh: its last failure, progress, and manual trigger. */
export interface RefreshState {
  /** A failed refresh while earlier data stays on screen. */
  error: Error | null;
  refreshing: boolean;
  onRefresh: () => void;
}
