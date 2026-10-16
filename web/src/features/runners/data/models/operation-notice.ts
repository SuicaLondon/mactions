import { NetworkError } from '../../../../shared/api/client';
import type { Operation } from '../../../../shared/api/types';

export type OperationNoticeState = 'progress' | 'success' | 'error';

export interface OperationNotice {
  /** Changes for every new notice so timers and dismissals target the current one. */
  id: number;
  state: OperationNoticeState;
  message: string;
}

export interface OperationCallbacks {
  /** The caller shows failures in place, so the toast clears instead of repeating them. */
  reportsErrors?: boolean;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export const SUCCESS_MESSAGE = 'Done. GitHub connectivity may take a moment to update.';

export const UNKNOWN_RESULT_MESSAGE =
  'Could not reach mactions, so the result is unknown. Refresh to check the runner before retrying.';

/** A lost connection leaves the result unknown, so the message asks for a refresh first. */
export function operationErrorMessage(error: Error) {
  if (error instanceof NetworkError) return UNKNOWN_RESULT_MESSAGE;
  return error.message;
}

export function operationAction(operation: Operation | undefined) {
  if (!operation) return null;
  const match = /^\/api\/runners\/(\d+)\/([a-z]+)$/.exec(operation.path);
  if (!match) return null;
  return { runnerId: Number(match[1]), action: match[2] };
}
