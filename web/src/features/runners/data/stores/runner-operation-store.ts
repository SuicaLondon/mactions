import { addSeconds, toDate } from 'date-fns';
import { create } from 'zustand';

import { currentDate } from '../../../../shared/lib/date';
import type { OperationNotice } from '../models/operation-notice';

export interface RunnerOperationStore {
  notice: OperationNotice | null;
  /** Set synchronously so two clicks before React's next render cannot start two operations. */
  mutating: boolean;
  /** Polls faster until GitHub reflects a start, stop, or restart. */
  syncUntil: Date;
  nextNoticeId: number;
  show: (state: OperationNotice['state'], message: string) => void;
  dismissNotice: (id: number) => void;
  clearNotice: () => void;
  claim: () => boolean;
  release: (path: string) => void;
  reset: () => void;
}

const initialState = { notice: null, mutating: false, syncUntil: toDate(0), nextNoticeId: 1 };

// One local fleet operation runs at a time, whichever component starts it.
export const useRunnerOperationStore = create<RunnerOperationStore>()((set, get) => ({
  ...initialState,
  show: (state, message) =>
    set(({ nextNoticeId }) => ({
      notice: { id: nextNoticeId, state, message },
      nextNoticeId: nextNoticeId + 1,
    })),
  dismissNotice: (id) =>
    set(({ notice }) => {
      if (notice?.id === id) return { notice: null };
      return {};
    }),
  clearNotice: () => set({ notice: null }),
  claim: () => {
    if (get().mutating) return false;
    set({ mutating: true });
    return true;
  },
  release: (path) => {
    let syncUntil = get().syncUntil;
    if (/\/(start|stop|restart)$/.test(path)) syncUntil = addSeconds(currentDate(), 60);
    set({ mutating: false, syncUntil });
  },
  reset: () => set(initialState),
}));
