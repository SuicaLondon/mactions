import { useRunnerPolling } from '../../features/runners/data/hooks/use-runner-polling';
import { useLocationSync } from '../navigation/hooks/use-location-sync';
import { usePageHydration } from '../navigation/hooks/use-page-hydration';
import { RunnerOverlays } from '../runners/components/RunnerOverlays';
import { AppWorkspace } from '../shell/components/AppWorkspace';

/** Renders the app session that startAppSession() started. */
export default function App() {
  useLocationSync();
  usePageHydration();
  useRunnerPolling();
  return (
    <>
      <AppWorkspace />
      <RunnerOverlays />
    </>
  );
}
