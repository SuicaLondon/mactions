import { AppProviders } from '../providers/components/AppProviders';
import { RunnerOverlays } from '../runners/components/RunnerOverlays';
import { AppWorkspace } from '../shell/components/AppWorkspace';

export default function App() {
  return (
    <AppProviders>
      <AppWorkspace />
      <RunnerOverlays />
    </AppProviders>
  );
}
