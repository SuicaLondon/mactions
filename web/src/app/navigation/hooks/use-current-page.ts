import { useNavigationStore } from '../stores/navigation-store';

export function useCurrentPage() {
  return useNavigationStore((state) => state.pages[state.pages.length - 1]);
}
