import type { Runner } from '../../../../shared/api/types';
import {
  CHECKING_GITHUB_STATUS,
  remoteStatusFor,
  type RunnerStatusText,
  statusFor,
} from '../../shared/models/runner-model';
import type { DisplayRunner } from './runner-list';
import { deviceLabels } from './runner-row';

export interface RunnerRowPresentation {
  target: Runner['target'] | undefined;
  state: RunnerStatusText;
  statusLabel: string;
  statusTitle: string | undefined;
  checkingLabels: boolean;
  labelsTitle: string | undefined;
  deviceLabel: string;
  scopeLabel: string;
}

/** The text a runner row shows, given whether GitHub's first inventory answer is pending. */
export function runnerRowPresentation(
  row: DisplayRunner,
  checkingGitHub: boolean,
): RunnerRowPresentation {
  const target = row.local?.target ?? row.remote?.target;
  // Local rows without GitHub data wait for the first inventory answer instead of guessing.
  const checking = checkingGitHub && !row.remote;
  const checkingLabels = checking && !row.local?.github_labels;
  let state = remoteStatusFor(row.remote);
  if (row.local) state = statusFor(row.local, checking);
  // The narrow Status column fits only the short form; the title keeps the full state.
  let statusLabel = state.text;
  let statusTitle: string | undefined;
  if (state === CHECKING_GITHUB_STATUS) {
    statusLabel = 'Checking…';
    statusTitle = state.text;
  }
  let labelsTitle: string | undefined = row.labels.join(', ');
  if (checkingLabels) labelsTitle = undefined;
  let scopeLabel = 'Repository';
  if (target?.kind === 'org') scopeLabel = 'Organization';
  if (row.scopeUnconfirmed) scopeLabel = 'Repository access unconfirmed';
  return {
    target,
    state,
    statusLabel,
    statusTitle,
    checkingLabels,
    labelsTitle,
    deviceLabel: deviceLabels[row.device],
    scopeLabel,
  };
}
