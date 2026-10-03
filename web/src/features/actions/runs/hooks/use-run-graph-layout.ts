import { useMemo, useState } from 'react';

import type { JobSummary } from '../../data/types/activity-types';
import { prepareRunGraphLayout, type RunGraphData } from '../models/run-graph';

export function useRunGraphLayout(graph: RunGraphData, jobs: JobSummary[]) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  function toggleExpanded(id: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const geometry = useMemo(
    () => prepareRunGraphLayout(graph, jobs, expanded),
    [graph, jobs, expanded],
  );
  return { ...geometry, expanded, toggleExpanded };
}
