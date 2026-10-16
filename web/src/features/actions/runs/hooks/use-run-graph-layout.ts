import { useMemo } from 'react';

import type { JobSummary } from '../../data/types/activity-types';
import {
  prepareRunGraphLayout,
  type RunGraphData,
  type RunGraphGeometry,
} from '../models/run-graph';

export function useRunGraphLayout(
  graph: RunGraphData,
  jobs: JobSummary[],
  expanded: ReadonlySet<string>,
): RunGraphGeometry {
  return useMemo(() => prepareRunGraphLayout(graph, jobs, expanded), [graph, jobs, expanded]);
}
