import { create } from 'zustand';

import {
  createDraft,
  type RunnerCreationDraft,
  type RunnerCreationSeed,
  type RunnerRegistrationMode,
  type RunnerScopeKind,
} from '../models/runner-creation';

export interface RunnerCreationStore extends RunnerCreationDraft {
  /**
   * The last creation failure. It outlives the failed request so a retry keeps it in place while
   * pending; editing the draft, going Back, or a successful creation clears it.
   */
  failure: string | null;
  /** Starts a new Add runner session; the opener calls it before showing the dialog. */
  start: (seed: RunnerCreationSeed) => void;
  setMode: (mode: RunnerRegistrationMode) => void;
  changeKind: (kind: RunnerScopeKind) => void;
  setTarget: (target: string) => void;
  setToken: (token: string) => void;
  setPrefix: (prefix: string) => void;
  setLabels: (labels: string) => void;
  continueToTarget: () => void;
  goBack: () => void;
  setFailure: (failure: string | null) => void;
}

// One draft lives for the whole dialog session, so Back keeps entered settings.
export const useRunnerCreationStore = create<RunnerCreationStore>()((set) => ({
  ...createDraft({}),
  failure: null,
  start: (seed) => set({ ...createDraft(seed), failure: null }),
  setMode: (mode) => set({ mode, failure: null }),
  changeKind: (kind) =>
    set((current) => {
      if (current.kind === kind) return current;
      return { kind, target: '', failure: null };
    }),
  setTarget: (target) => set({ target, failure: null }),
  setToken: (token) => set({ token, failure: null }),
  setPrefix: (prefix) => set({ prefix, failure: null }),
  setLabels: (labels) => set({ labels, failure: null }),
  continueToTarget: () => set({ step: 2 }),
  goBack: () => set({ step: 1, failure: null }),
  setFailure: (failure) => set({ failure }),
}));
