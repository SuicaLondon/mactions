import { useCallback, useEffect, useRef, useState } from 'react';

import type { Runner } from '../../../../shared/api/types';
import type { ActivityRunner } from '../../../actions/data/types/activity-types';
import { type RunnerSelection } from '../../list/models/runner-list';

export function useRunnerInspector(rows: Runner[], loaded: boolean, blocked: boolean) {
  const [details, setDetails] = useState<RunnerSelection | null>(null);
  const detailsReturnFocus = useRef<HTMLElement | null>(null);
  const closeDetailsButton = useRef<HTMLButtonElement>(null);
  let selectedLocal: Runner | undefined;
  if (details?.localId !== undefined) {
    selectedLocal = rows.find((runner) => runner.id === details.localId);
  }
  let selected = selectedLocal;
  if (selectedLocal && details?.remote) {
    selected = {
      ...selectedLocal,
      github_status: details.remote.status,
      busy: details.remote.busy,
      github_labels: details.remote.github_labels ?? selectedLocal.github_labels,
    };
  }

  const updateInventoryDetails = useCallback((runners: ActivityRunner[]) => {
    setDetails((current) => {
      if (!current) return current;
      const remote = runners.find((runner) => {
        if (current.localId !== undefined) return runner.local_id === current.localId;
        return runner.github_id === current.githubId;
      });
      if (remote && remote !== current.remote) return { ...current, remote };
      return current;
    });
  }, []);

  const closeDetails = useCallback(() => {
    setDetails(null);
    detailsReturnFocus.current?.focus({ preventScroll: true });
  }, []);
  const clearDetails = useCallback(() => setDetails(null), []);

  useEffect(() => {
    if (details?.key) closeDetailsButton.current?.focus();
  }, [details?.key]);

  useEffect(() => {
    if (details?.localId !== undefined && loaded && !selectedLocal) {
      // eslint-disable-next-line react-x/set-state-in-effect -- Close an inspector when its runner disappears from the external inventory.
      setDetails(null);
    }
  }, [details?.localId, loaded, selectedLocal]);

  useEffect(() => {
    if (!details || blocked) return;
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDetails();
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [details, blocked, closeDetails]);

  const openDetails = useCallback((runner: RunnerSelection) => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) detailsReturnFocus.current = activeElement;
    setDetails(runner);
  }, []);

  return {
    details,
    openDetails,
    clearDetails,
    selected,
    updateInventoryDetails,
    closeDetailsButton,
    closeDetails,
  };
}
