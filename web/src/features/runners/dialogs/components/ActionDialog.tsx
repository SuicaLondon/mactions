import { type Action, type Operation, type Runner } from '../../../../shared/api/types';
import { ModalDialog } from '../../../../shared/ui/dialog/components/ModalDialog';
import { actionDialogCopy } from '../models/action-dialog-copy';
import { actionEntries, actionOperation } from '../models/action-operation';
import { ActionDialogButtons } from './ActionDialogButtons';
import { ActionDialogError } from './ActionDialogError';
import { LabelsField } from './LabelsField';

export interface ActionDialogProps {
  runner: Runner;
  action: Action;
  locked: boolean;
  /** The submitted operation is still running; the dialog closes only after it succeeds. */
  pending?: boolean;
  error?: string;
  onClose: () => void;
  onRun: (op: Operation) => void;
}

export function ActionDialog({
  runner,
  action,
  locked,
  pending = false,
  error,
  onClose,
  onRun,
}: ActionDialogProps) {
  const editing = action === 'labels';
  const retrying = action === 'retry';
  const { title, submitLabel, description } = actionDialogCopy(action, runner);
  return (
    <ModalDialog
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      {(titleId) => (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (locked) return;
            onRun(
              actionOperation(action, runner, actionEntries(new FormData(event.currentTarget))),
            );
          }}
        >
          <h2 id={titleId}>{title}</h2>
          <p className="mx-0 mt-0 mb-4 text-xs/relaxed text-muted">{description}</p>
          {!!editing && <LabelsField runner={runner} readOnly={pending} />}
          {/* An optional fresh registration token for resuming setup. */}
          {!!retrying && (
            <label className="mt-4 flex flex-col gap-2 text-xs">
              Registration token (optional)
              <input
                name="registration_token"
                type="password"
                autoComplete="off"
                readOnly={pending}
              />
            </label>
          )}
          <ActionDialogButtons
            submitLabel={submitLabel}
            destructive={action === 'delete'}
            focusCancel={!editing}
            locked={locked}
            pending={pending}
            onCancel={onClose}
          />
          {/* Below the actions, so a failure never moves the controls the user just used. */}
          {!!error && <ActionDialogError message={error} keepsEntries={editing || retrying} />}
        </form>
      )}
    </ModalDialog>
  );
}
