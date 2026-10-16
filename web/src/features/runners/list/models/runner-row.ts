import type { Runner } from '../../../../shared/api/types';
import type { Device, WorkflowRun } from '../../../actions/data/types/activity-types';
import type { RunnerSelection } from './runner-list';
export const deviceLabels: Record<Device, string> = {
  this_device: 'This device',
  other_device: 'Other device',
  unknown: 'Device unknown',
};

/** What a row does when opened, inspected, or asked for its context menu. */
export interface RunnerRowCallbacks {
  onOpen: (runner: RunnerSelection) => void;
  onDetails: (runner: RunnerSelection) => void;
  onMenu: (runner: Runner, x: number, y: number) => void;
}

/** GitHub's current work, shared by every row. */
export interface RunnerWorkState {
  runs: WorkflowRun[];
  /** The connection check or the first work read is still pending. */
  loading: boolean;
  connected: boolean;
  unavailable: boolean;
}
