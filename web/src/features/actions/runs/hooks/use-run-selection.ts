import { useCallback, useMemo, useState } from 'react';

import type { Job } from '../../../../shared/api/types';
import type { JobSelection } from '../../jobs/types/job-selection';

interface RunSelectionOptions {
  initialJobId?: number;
  initialStepNumber?: number;
  controlledSelection?: { jobId: number | null; stepNumber?: number };
  onSelectionChange?: (selection: { jobId: number | null; stepNumber?: number }) => void;
}

export function useRunSelection({
  initialJobId,
  initialStepNumber,
  controlledSelection,
  onSelectionChange,
}: RunSelectionOptions) {
  let initialSelection: JobSelection | null = null;
  if (initialJobId !== undefined) {
    initialSelection = { jobId: initialJobId, stepNumber: initialStepNumber };
  }
  const [localSelection, setLocalSelection] = useState<JobSelection | null>(initialSelection);
  const selection = useMemo(() => {
    if (controlledSelection === undefined) return localSelection;
    if (controlledSelection.jobId === null) return null;
    return {
      jobId: controlledSelection.jobId,
      stepNumber: controlledSelection.stepNumber,
    };
  }, [controlledSelection, localSelection]);
  const [expandedJobIds, setExpandedJobIds] = useState<number[]>(() => {
    if (controlledSelection?.jobId) return [controlledSelection.jobId];
    if (initialJobId !== undefined) return [initialJobId];
    return [];
  });
  const [loadedJobs, setLoadedJobs] = useState<Record<number, Job>>({});
  const onJobLoaded = useCallback(
    (job: Job) =>
      setLoadedJobs((previous) => {
        if (previous[job.id] === job) return previous;
        return { ...previous, [job.id]: job };
      }),
    [],
  );
  const select = useCallback(
    (next: JobSelection) => {
      setLocalSelection(next);
      setExpandedJobIds((previous) => {
        if (previous.includes(next.jobId)) return previous;
        return [...previous, next.jobId];
      });
      onSelectionChange?.(next);
    },
    [onSelectionChange],
  );
  const showOverview = useCallback(() => {
    setLocalSelection(null);
    onSelectionChange?.({ jobId: null });
  }, [onSelectionChange]);
  const toggle = useCallback((jobId: number, expanded: boolean) => {
    setExpandedJobIds((previous) => {
      if (expanded) return [...new Set([...previous, jobId])];
      return previous.filter((id) => id !== jobId);
    });
  }, []);
  const selectJob = useCallback((jobId: number) => select({ jobId }), [select]);
  return {
    selectJob,
    selection,
    expandedJobIds,
    loadedJobs,
    onJobLoaded,
    select,
    showOverview,
    toggle,
  };
}
