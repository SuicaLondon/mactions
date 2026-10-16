import { useRunnerCreationStore } from '../../features/runners/creation/stores/runner-creation-store';
import { useRunnerOperationStore } from '../../features/runners/data/stores/runner-operation-store';
import { useRunnerInspectorStore } from '../../features/runners/inspector/stores/runner-inspector-store';
import { useNavigationStore } from '../navigation/stores/navigation-store';
import { useRunnerWorkspaceStore } from '../runners/stores/runner-workspace-store';
import { useWelcomeStore } from '../setup/stores/welcome-store';

/** Starts the app's client state from saved preferences; call before rendering App. */
export function startAppSession() {
  useNavigationStore.getState().restore();
  useWelcomeStore.getState().restore();
  useRunnerWorkspaceStore.getState().reset();
  useRunnerInspectorStore.getState().reset();
  useRunnerOperationStore.getState().reset();
  useRunnerCreationStore.getState().start({});
}
