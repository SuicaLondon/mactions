import { memo } from 'react';

import type { Job } from '../../../../../shared/api/types';
import type { JobSummary } from '../../../data/types/activity-types';
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
  const { tree, focused, setFocused, first, keyboard } = useJobTree(
    jobs,
    expandedJobIds,
    onSelect,
    onToggle,
  );
  return (
    <ul
      ref={tree}
      className="job-tree m-0 list-none p-0"
      role="tree"
      aria-label="Run jobs and steps"
    >
      {jobs.map((job, index) => (
        <JobTreeItem
          key={job.id}
          job={job}
          index={index}
          count={jobs.length}
          detail={loadedJobs[job.id]}
          expanded={expandedJobIds.includes(job.id)}
          highlightRunnerId={highlightRunnerId}
          selected={selected}
          focused={focused}
          first={first}
          setFocused={setFocused}
          keyboard={keyboard}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </ul>
  );
});
