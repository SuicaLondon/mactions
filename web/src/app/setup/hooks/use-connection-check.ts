import { useConnection } from '../../../features/github/hooks/use-connection';

/** A connection check that failed before any connection state was known. */
export function useConnectionCheck() {
  const connection = useConnection();
  // Query results only rerender for the fields read here, so read the failure fields that
  // consumers need. A retry clears the error, so the failure is remembered by its count.
  const failed = !connection.data && connection.errorUpdateCount > 0;
  let error: string | undefined;
  let checking = false;
  if (failed) {
    error = connection.error?.message;
    checking = connection.isFetching;
  }
  return { failed, error, checking, retry: () => void connection.refetch() };
}
