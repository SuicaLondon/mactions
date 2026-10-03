import type { Job } from '../../../shared/api/types';

export interface WorkflowRun {
  key: string;
  jobs: Job[];
}

export interface WorkflowGraphProps {
  jobs: Job[];
  selectedJobId: number | null;
  onSelectJob: (id: number) => void;
  at?: number;
}
