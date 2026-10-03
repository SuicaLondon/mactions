import type { Runner } from '../../../../shared/api/types';
import type { Device, WorkflowRun } from '../../../actions/data/types/activity-types';
import type { DisplayRunner, RunnerSelection } from './runner-list';
export const deviceLabels: Record<Device, string> = {
  this_device: 'This device',
  other_device: 'Other device',
  unknown: 'Device unknown',
};

export interface RunnerListRowProps {
  row: DisplayRunner;
  selected: boolean;
  runs: WorkflowRun[];
  loadingWork: boolean;
  connected: boolean | undefined;
  unavailableWork: boolean;
  onOpen: (runner: RunnerSelection) => void;
  onMenu: (runner: Runner, x: number, y: number) => void;
  onDetails: (runner: RunnerSelection) => void;
}
