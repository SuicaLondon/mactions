import { useCallback, useMemo, useState } from 'react';

import type { JobSelection } from '../../jobs/types/job-selection';

/** A run's Job selection as the caller sees it; a null `jobId` is the Overview. */
export interface RunSelection {
  jobId: number | null;
  stepNumber?: number;
}

interface RunJobSelectionOptions {
  initialJobId?: number;
  initialStepNumber?: number;
  /** A caller-owned selection, which replaces the local one. */
  controlledSelection?: RunSelection;
  onSelectionChange?: (selection: RunSelection) => void;
  /** Runs for every Job or step selection, before the caller is told. Must be stable. */
  onSelect?: (selection: JobSelection) => void;
}

/** The Job and step a run shows, or null for the Overview. */
export function useRunJobSelection({
  initialJobId,
  initialStepNumber,
  controlledSelection,
  onSelectionChange,
  onSelect,
}: RunJobSelectionOptions) {
  const [localSelection, setLocalSelection] = useState<JobSelection | null>(() => {
    if (initialJobId === undefined) return null;
    return { jobId: initialJobId, stepNumber: initialStepNumber };
  });
  const selection = useMemo(() => {
    if (controlledSelection === undefined) return localSelection;
    if (controlledSelection.jobId === null) return null;
    return {
      jobId: controlledSelection.jobId,
      stepNumber: controlledSelection.stepNumber,
    };
  }, [controlledSelection, localSelection]);
  const select = useCallback(
    (next: JobSelection) => {
      setLocalSelection(next);
      onSelect?.(next);
      onSelectionChange?.(next);
    },
    [onSelect, onSelectionChange],
  );
  const selectJob = useCallback((jobId: number) => select({ jobId }), [select]);
  const showOverview = useCallback(() => {
    setLocalSelection(null);
    onSelectionChange?.({ jobId: null });
  }, [onSelectionChange]);
  return { selection, select, selectJob, showOverview };
}
