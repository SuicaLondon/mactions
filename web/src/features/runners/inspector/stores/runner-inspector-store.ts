import { create } from 'zustand';

import type { ActivityRunner } from '../../../actions/data/types/activity-types';
import type { RunnerSelection } from '../../list/models/runner-list';
import { withInventory } from '../models/runner-inspector';

export interface RunnerInspectorStore {
  details: RunnerSelection | null;
  /** The element focused before details opened; focus returns there when they close. */
  returnFocus: HTMLElement | null;
  /** Counts explicit opens; each one moves focus into the panel. Following a row does not. */
  focusRequest: number;
  openDetails: (runner: RunnerSelection) => void;
  /** Shows an open panel's details for the newly focused row, leaving focus on that row. */
  followDetails: (runner: RunnerSelection) => void;
  closeDetails: () => void;
  clearDetails: () => void;
  updateInventoryDetails: (runners: ActivityRunner[]) => void;
  reset: () => void;
}

export const useRunnerInspectorStore = create<RunnerInspectorStore>()((set, get) => ({
  details: null,
  returnFocus: null,
  focusRequest: 0,
  openDetails: (runner) => {
    const activeElement = document.activeElement;
    let returnFocus = get().returnFocus;
    if (activeElement instanceof HTMLElement) returnFocus = activeElement;
    set(({ focusRequest }) => ({ details: runner, returnFocus, focusRequest: focusRequest + 1 }));
  },
  followDetails: (runner) => {
    const { details } = get();
    if (!details || details.key === runner.key) return;
    const activeElement = document.activeElement;
    let returnFocus = get().returnFocus;
    if (activeElement instanceof HTMLElement) returnFocus = activeElement;
    set({ details: runner, returnFocus });
  },
  closeDetails: () => {
    set({ details: null });
    get().returnFocus?.focus({ preventScroll: true });
  },
  clearDetails: () => set({ details: null }),
  updateInventoryDetails: (runners) =>
    set(({ details }) => {
      const next = withInventory(details, runners);
      if (next === details) return {};
      return { details: next };
    }),
  reset: () => set({ details: null, returnFocus: null }),
}));
