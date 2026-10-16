import { memo } from 'react';

import type { Job } from '../../../../../shared/api/types';
import type { JobSummary } from '../../../data/types/activity-types';
import { ranOnRunner } from '../../../shared/models/job-runner';
import { useJobTree } from '../../hooks/use-job-tree';
import type { JobSelection } from '../../types/job-selection';
import { JobTreeItem } from './JobTreeItem';

export const JobTree = memo(function JobTree({
  jobs,
  loadedJobs,
  selected,
  expandedJobIds,
  highlightRunnerId,
  onSelect,
  onToggle,
}: {
  jobs: JobSummary[];
  loadedJobs: Record<number, Job>;
  selected: JobSelection | null;
  expandedJobIds: number[];
  highlightRunnerId?: number;
  onSelect: (selection: JobSelection) => void;
  onToggle: (jobId: number, expanded: boolean) => void;
}) {
  const { tree, tabbable, onFocus, onClick, onKeyDown } = useJobTree(
    jobs,
    expandedJobIds,
    onSelect,
    onToggle,
  );
  return (
    <ul
      ref={tree}
      className="m-0 list-none p-0"
      role="tree"
      aria-label="Run jobs and steps"
      onFocus={onFocus}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {jobs.map((job, index) => {
        let selection: JobSelection | undefined;
        if (selected?.jobId === job.id) selection = selected;
        return (
          <JobTreeItem
            key={job.id}
            job={job}
            position={{ index, count: jobs.length }}
            detail={loadedJobs[job.id]}
            expanded={expandedJobIds.includes(job.id)}
            ranOnSelectedRunner={ranOnRunner(job, highlightRunnerId)}
            selection={selection}
            tabbable={tabbable}
          />
        );
      })}
    </ul>
  );
});
