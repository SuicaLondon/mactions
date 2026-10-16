import { type RefObject, useEffect } from 'react';

import type { Runner } from '../../../../shared/api/types';
import { localSelection } from '../models/runner-inspector';
import { useRunnerInspectorStore } from '../stores/runner-inspector-store';

export interface RunnerInspectorSyncOptions {
  rows: Runner[];
  loaded: boolean;
  /** Store-held dialogs, menus, and the welcome guide own Escape while they are open. */
  blocked: boolean;
  closeButton: RefObject<HTMLButtonElement | null>;
}

/** Any open dialog or popover sits above the panel, including ones kept in local state. */
function hasOpenLayer() {
  return document.querySelector('dialog[open], :popover-open') !== null;
}

/** Synchronizes the open inspector with focus, the keyboard, and the local inventory. */
export function useRunnerInspectorSync({
  rows,
  loaded,
  blocked,
  closeButton,
}: RunnerInspectorSyncOptions) {
  const details = useRunnerInspectorStore((state) => state.details);
  const focusRequest = useRunnerInspectorStore((state) => state.focusRequest);
  const missing = loaded && details?.localId !== undefined && !localSelection(details, rows);

  // Explicit opens move focus into the panel; a panel following row focus leaves it on the row.
  useEffect(() => {
    if (focusRequest) closeButton.current?.focus();
  }, [focusRequest, closeButton]);

  useEffect(() => {
    // Close an inspector when its runner disappears from the external inventory.
    if (missing) useRunnerInspectorStore.getState().clearDetails();
  }, [missing]);

  useEffect(() => {
    if (!details || blocked) return;
    const escape = (event: globalThis.KeyboardEvent) => {
      // Escape belongs to the topmost layer; leave it to an open dialog, popover, or inner control.
      if (event.key !== 'Escape' || event.defaultPrevented || hasOpenLayer()) return;
      event.preventDefault();
      useRunnerInspectorStore.getState().closeDetails();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [details, blocked]);
}
