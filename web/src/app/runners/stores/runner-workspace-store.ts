import { create } from 'zustand';

import { useRunnerCreationStore } from '../../../features/runners/creation/stores/runner-creation-store';
import type { Action, Runner } from '../../../shared/api/types';
import { useNavigationStore } from '../../navigation/stores/navigation-store';
import {
  creationTarget,
  type RunnerMenuState,
  type RunnerModalState,
} from '../models/runner-workspace';

export interface RunnerWorkspaceStore {
  menu: RunnerMenuState | null;
  modal: RunnerModalState;
  openMenu: (runner: Runner, x: number, y: number) => void;
  closeMenu: () => void;
  openCreate: (initialMode?: 'token') => void;
  openStorage: () => void;
  openAction: (runner: Runner, action: Action) => void;
  setActionError: (error?: string) => void;
  /** Closes an action dialog after its operation succeeds, unless another dialog replaced it. */
  finishAction: () => void;
  closeModal: () => void;
  reset: () => void;
}

export const useRunnerWorkspaceStore = create<RunnerWorkspaceStore>()((set) => ({
  menu: null,
  modal: null,
  openMenu: (runner, x, y) => set({ menu: { runner, x, y } }),
  closeMenu: () => set({ menu: null }),
  openCreate: (initialMode) => {
    const { scope } = useNavigationStore.getState().preferences;
    useRunnerCreationStore.getState().start({ initialMode, initialTarget: creationTarget(scope) });
    set({ modal: { type: 'create' } });
  },
  openStorage: () => set({ modal: { type: 'storage' } }),
  openAction: (runner, action) => set({ modal: { type: 'action', runner, action } }),
  setActionError: (error) =>
    set(({ modal }) => {
      if (modal?.type !== 'action') return {};
      return { modal: { ...modal, error } };
    }),
  finishAction: () =>
    set(({ modal }) => {
      if (modal?.type !== 'action') return {};
      return { modal: null };
    }),
  closeModal: () => set({ modal: null }),
  reset: () => set({ menu: null, modal: null }),
}));
