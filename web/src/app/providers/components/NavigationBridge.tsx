import { useRunnerWorkspace } from '../../runners/hooks/use-runner-workspace';
import type { ProviderProps } from '../types';
import { NavigationProvider } from './NavigationProvider';

export function NavigationBridge({ children }: ProviderProps) {
  const { inspector } = useRunnerWorkspace();
  return <NavigationProvider clearDetails={inspector.clearDetails}>{children}</NavigationProvider>;
}
