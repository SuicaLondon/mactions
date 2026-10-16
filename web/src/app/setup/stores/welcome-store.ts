import { create } from 'zustand';

import { readWelcomeDismissed, rememberWelcomeDismissed } from '../models/welcome-storage';

export interface WelcomeStore {
  dismissed: boolean;
  /** The user reopened GitHub setup after dismissing the first-visit guide. */
  setupOpen: boolean;
  restore: () => void;
  openSetup: () => void;
  dismissWelcome: () => void;
  /** A confirmed connection retires the first-visit guide without closing reopened setup. */
  rememberConnection: () => void;
}

export const useWelcomeStore = create<WelcomeStore>()((set) => ({
  dismissed: false,
  setupOpen: false,
  restore: () => set({ dismissed: readWelcomeDismissed(), setupOpen: false }),
  openSetup: () => set({ setupOpen: true }),
  dismissWelcome: () => {
    rememberWelcomeDismissed();
    set({ dismissed: true, setupOpen: false });
  },
  rememberConnection: () => {
    rememberWelcomeDismissed();
    set({ dismissed: true });
  },
}));
