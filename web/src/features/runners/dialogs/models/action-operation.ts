import type { Action, Operation, Runner } from '../../../../shared/api/types';
import { splitLabels } from '../../shared/models/runner-model';
import { operationCopy } from './operation-copy';

/** What the user entered in the dialog's optional fields. */
export interface ActionDialogEntries {
  labels: string;
  registrationToken: string;
}

function formText(form: FormData, name: string) {
  const value = form.get(name);
  if (typeof value === 'string') return value;
  return '';
}

/** Reads the optional fields from the submitted dialog form. */
export function actionEntries(form: FormData): ActionDialogEntries {
  return {
    labels: formText(form, 'labels'),
    registrationToken: formText(form, 'registration_token'),
  };
}

function actionPayload(action: Action, { labels, registrationToken }: ActionDialogEntries) {
  if (action === 'labels') return { labels: splitLabels(labels) };
  if (action === 'retry') {
    const token = registrationToken.trim();
    if (token) return { registration_token: token };
    return {};
  }
  return { confirm: true };
}

/** The operation a confirmed action dialog submits. */
export function actionOperation(
  action: Action,
  runner: Runner,
  entries: ActionDialogEntries,
): Operation {
  const copy = operationCopy(action, runner.name);
  return {
    path: `/api/runners/${runner.id}/${action}`,
    payload: actionPayload(action, entries),
    message: copy.progress,
    success: copy.success,
  };
}
