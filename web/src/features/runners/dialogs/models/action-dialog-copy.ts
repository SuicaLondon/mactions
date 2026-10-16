import type { Action, Runner } from '../../../../shared/api/types';

export interface ActionDialogCopy {
  title: string;
  submitLabel: string;
  description: string;
}

function actionDescription(action: Action, runner: Runner) {
  switch (action) {
    case 'delete':
      return 'This interrupts any active job, removes the GitHub registration, and permanently deletes this runner’s installation, workspace, and logs. Shared tool caches stay in place.';
    case 'retry':
      return 'Resume this runner’s incomplete setup. Use a fresh registration token if GitHub is not connected. Existing registration will be recovered when possible.';
    case 'labels':
      return 'Replace custom labels. Leave empty to clear them. GitHub’s default labels are read-only.';
    default: {
      // Only GitHub can confirm a runner is idle; an unknown state keeps the warning.
      const idle = runner.github_status === 'online' && runner.busy === false;
      let description = 'This begins shutdown immediately and may interrupt an active job.';
      if (idle)
        description =
          'This begins shutdown immediately. It is idle, so no job will be interrupted.';
      if (action === 'stop')
        return `${description} Files are preserved and the runner stays stopped until you start it again.`;
      return `${description} The runner starts again after shutdown completes.`;
    }
  }
}

/** The confirmation dialog's title, submit button, and consequences for an action. */
export function actionDialogCopy(action: Action, runner: Runner): ActionDialogCopy {
  const verb = action[0].toUpperCase() + action.slice(1);
  // Confirmations ask a question; the labels form is an edit, so its title is a plain statement.
  let title = `${verb} ${runner.name}?`;
  let submitLabel = verb;
  if (action === 'labels') {
    title = `Edit labels for ${runner.name}`;
    submitLabel = 'Save labels';
  }
  return {
    title,
    submitLabel,
    description: actionDescription(action, runner),
  };
}
