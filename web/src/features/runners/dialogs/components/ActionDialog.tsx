import type { Action, Operation, Runner } from '../../../../shared/api/types';
import { cn } from '../../../../shared/lib/cn';
import { runnerLabels, splitLabels } from '../../shared/models/runner-model';
import { RunnerDialog } from './RunnerDialog';

export function ActionDialog({
  runner,
  action,
  locked,
  onClose,
  onRun,
}: {
  runner: Runner;
  action: Action;
  locked: boolean;
  onClose: () => void;
  onRun: (op: Operation) => void;
}) {
  const editing = action === 'labels';
  const retrying = action === 'retry';
  const verb = action[0].toUpperCase() + action.slice(1);
  let titleVerb = verb;
  let submitLabel = verb;
  if (editing) {
    titleVerb = 'Edit labels for';
    submitLabel = 'Save labels';
  }
  const title = `${titleVerb} ${runner.name}?`;
  let description;
  if (action === 'delete')
    description =
      'This interrupts any active job, removes the GitHub registration, and permanently deletes this runner’s installation, workspace, and logs. Shared tool caches stay in place.';
  else if (retrying)
    description =
      'Resume this runner’s incomplete setup. Use a fresh registration token if GitHub is not connected. Existing registration will be recovered when possible.';
  else if (editing)
    description =
      'Replace custom labels. Leave empty to clear them. GitHub’s default labels are read-only.';
  else {
    description = 'This begins shutdown immediately and may interrupt an active job.';
    if (action === 'stop')
      description += ' Files are preserved and the runner stays stopped until you start it again.';
    else description += ' The runner starts again after shutdown completes.';
  }
  return (
    <RunnerDialog title={title} onClose={onClose}>
      {(titleId) => (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (locked) return;
            const form = new FormData(event.currentTarget);
            const token = String((form.get('registration_token') as string | null) ?? '').trim();
            let payload;
            if (editing)
              payload = {
                labels: splitLabels(String((form.get('labels') as string | null) ?? '')),
              };
            else if (retrying) {
              payload = {};
              if (token) payload = { registration_token: token };
            } else payload = { confirm: true };
            let messageVerb = 'Restarting';
            if (editing) messageVerb = 'Updating labels for';
            else if (action === 'delete') messageVerb = 'Deleting';
            else if (action === 'stop') messageVerb = 'Stopping';
            onRun({
              path: `/api/runners/${runner.id}/${action}`,
              payload,
              message: `${messageVerb} ${runner.name}…`,
            });
          }}
        >
          <h2 id={titleId}>{title}</h2>
          <p className="dialog-description mx-0 mt-0 mb-4 text-xs leading-relaxed text-muted">
            {description}
          </p>
          {!!editing && (
            <label id="label-field" className="block text-xs">
              Custom labels
              <input
                id="label-input"
                className="mt-1.75 w-full"
                name="labels"
                autoFocus
                defaultValue={runnerLabels(runner)
                  .filter((l) => l.type === 'custom')
                  .map((l) => l.name)
                  .join(', ')}
                placeholder="Comma-separated labels"
                spellCheck={false}
              />
            </label>
          )}
          {!!retrying && (
            <label className="create-fields mt-4 flex flex-col gap-2 text-xs">
              Registration token (optional)
              <input name="registration_token" type="password" autoComplete="off" />
            </label>
          )}
          <div className="dialog-actions mt-6 flex justify-end gap-2">
            <button
              type="button"
              autoFocus={!editing}
              onClick={onClose}
              className="min-w-19.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={cn(
                'primary',
                {
                  danger: action === 'delete',
                },
                'min-w-19.5 text-xs',
              )}
              disabled={locked}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      )}
    </RunnerDialog>
  );
}
