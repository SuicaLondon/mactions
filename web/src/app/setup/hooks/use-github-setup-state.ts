import { useConnection } from '../../../features/github/hooks/connection/use-connection';
import { useWelcome } from './use-welcome';

export function useGitHubSetupState() {
  const connection = useConnection();
  const connected = Boolean(connection.data?.connected);
  const disconnected =
    connection.isSuccess && !connection.data.connected && connection.data.state !== 'unavailable';
  const { welcome, setSetupOpen, dismissWelcome } = useWelcome(connected, disconnected);

  return {
    connection,
    connected,
    disconnected,
    welcome,
    openSetup: () => setSetupOpen(true),
    dismissWelcome,
  };
}
