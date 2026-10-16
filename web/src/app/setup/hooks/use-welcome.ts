import { useConnection } from '../../../features/github/hooks/use-connection';
import { useWelcomeStore } from '../stores/welcome-store';

/** Whether the GitHub welcome guide is showing. */
export function useWelcome() {
  const connection = useConnection();
  const disconnected =
    connection.isSuccess && !connection.data.connected && connection.data.state !== 'unavailable';
  return useWelcomeStore((state) => state.setupOpen || (!state.dismissed && disconnected));
}
