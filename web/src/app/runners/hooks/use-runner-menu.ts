import { useLocalRunners } from '../../../features/runners/data/hooks/use-local-runners';
import { currentMenu } from '../models/runner-workspace';
import { useRunnerWorkspaceStore } from '../stores/runner-workspace-store';

export function useRunnerMenu() {
  const menu = useRunnerWorkspaceStore((state) => state.menu);
  return currentMenu(menu, useLocalRunners());
}
