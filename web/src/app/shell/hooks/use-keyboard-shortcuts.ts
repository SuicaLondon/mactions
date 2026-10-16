import { useEffect, useEffectEvent } from 'react';

import { useRunnerOperationLocked } from '../../../features/runners/data/hooks/use-runner-operation-locked';
import { useRunnersLoading } from '../../../features/runners/data/hooks/use-runners-loading';
import { useNavigationStore } from '../../navigation/stores/navigation-store';
import { useRunnerWorkspaceStore } from '../../runners/stores/runner-workspace-store';
import {
  findAdjacentRow,
  findRefreshButton,
  findSearchInput,
  hasCommandModifier,
  hasFocusedRow,
  hasOpenDialog,
  isEditableTarget,
} from '../models/keyboard-shortcuts';

/** Single-key shortcuts for the app shell; fields, modifiers, and open dialogs suppress them. */
export function useKeyboardShortcuts({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const changeView = useNavigationStore((state) => state.changeView);
  const openCreate = useRunnerWorkspaceStore((state) => state.openCreate);
  const loading = useRunnersLoading();
  const locked = useRunnerOperationLocked();
  const canCreate = !loading && !locked;

  function focusRow(step: 1 | -1) {
    const row = findAdjacentRow(step);
    if (!row) return false;
    row.focus();
    return true;
  }

  function runShortcut(key: string) {
    switch (key) {
      case '/': {
        const search = findSearchInput();
        if (!search) return false;
        search.focus();
        return true;
      }
      case '1':
        changeView('runners');
        return true;
      case '2':
        changeView('runs');
        return true;
      case 'r':
      case 'R': {
        const refresh = findRefreshButton();
        if (!refresh || refresh.disabled) return false;
        refresh.click();
        return true;
      }
      case 'n':
      case 'N':
        if (!canCreate) return false;
        openCreate();
        return true;
      case 'j':
        return focusRow(1);
      case 'k':
        return focusRow(-1);
      // Arrows scroll the page unless a row has focus; rows that handle them prevent this.
      case 'ArrowDown':
        if (!hasFocusedRow()) return false;
        return focusRow(1);
      case 'ArrowUp':
        if (!hasFocusedRow()) return false;
        return focusRow(-1);
      case '?':
        onShowShortcuts();
        return true;
      default:
        return false;
    }
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || hasCommandModifier(event)) return;
    if (isEditableTarget(event.target) || hasOpenDialog()) return;
    // Some layouts and automation report Shift+/ as "/" with shiftKey instead of "?".
    let key = event.key;
    if (key === '/' && event.shiftKey) key = '?';
    if (runShortcut(key)) event.preventDefault();
  });

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
