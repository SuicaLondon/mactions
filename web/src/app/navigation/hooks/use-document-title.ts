import { useEffect } from 'react';

import { pageTitle } from '../models/app-navigation';
import { useNavigationStore } from '../stores/navigation-store';
import { useCurrentPage } from './use-current-page';

export function useDocumentTitle() {
  const page = useCurrentPage();
  const view = useNavigationStore((state) => state.preferences.view);
  useEffect(() => {
    document.title = pageTitle(page, view);
  }, [page, view]);
}
