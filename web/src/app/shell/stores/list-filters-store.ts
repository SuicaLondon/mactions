import { create } from 'zustand';

interface ListFiltersStore {
  /** Whether the phone filter panel is expanded; kept for the app session. */
  open: boolean;
  toggle: () => void;
}

export const useListFiltersStore = create<ListFiltersStore>()((set) => ({
  open: false,
  toggle: () => set(({ open }) => ({ open: !open })),
}));
