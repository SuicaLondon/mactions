import { useEffect } from 'react';

import type { OperationNotice } from '../../../features/runners/data/models/operation-notice';

export const SUCCESS_DISMISS_MS = 4_000;

/** Success confirmations clear themselves; progress and errors wait for the user. */
export function useNoticeAutoDismiss(
  notice: OperationNotice | null,
  onDismiss: (id: number) => void,
) {
  const id = notice?.id;
  const success = notice?.state === 'success';
  useEffect(() => {
    if (!success || id === undefined) return;
    const timer = setTimeout(() => onDismiss(id), SUCCESS_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [id, success, onDismiss]);
}
