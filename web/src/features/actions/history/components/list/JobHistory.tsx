import { useState } from 'react';

import type { Job } from '../../../../../shared/api/types';
import { useJobHistory } from '../../../data/hooks/use-job-history';
import type { WorkflowRun } from '../../../data/types/activity-types';
import { JobHistoryContent } from './JobHistoryContent';
import { JobHistoryHeader } from './JobHistoryHeader';

export function JobHistory({
  job,
  repository,
  highlightRunnerId,
  onOpenRun,
  status,
  onStatusChange,
  expandedJobIds,
  onExpandedJobsChange,
}: {
  job: Job;
  repository: string;
  highlightRunnerId?: number;
  onOpenRun?: (run: WorkflowRun) => void;
  status?: string;
  onStatusChange?: (status: string) => void;
  expandedJobIds?: number[];
  onExpandedJobsChange?: (ids: number[]) => void;
}) {
  const [localFilter, setLocalFilter] = useState('all');
  const [localExpandedJobIds, setLocalExpandedJobIds] = useState<number[]>([]);
  const filter = status ?? localFilter;
  const expanded = expandedJobIds ?? localExpandedJobIds;
  function toggleJob(id: number, open: boolean) {
    let next: number[];
    if (open) next = [...new Set([...expanded, id])];
    else next = expanded.filter((value) => value !== id);
    if (onExpandedJobsChange) onExpandedJobsChange(next);
    else setLocalExpandedJobIds(next);
  }
  const {
    query,
    allJobs,
    jobs,
    messages,
    refreshIntervalSeconds: refreshSeconds,
  } = useJobHistory(job, repository, filter);
  return (
    <section className="job-history" aria-label={`History for ${job.name}`}>
      <JobHistoryHeader
        job={job}
        repository={repository}
        refreshSeconds={refreshSeconds}
        allJobs={allJobs}
        filter={filter}
        onStatusChange={onStatusChange}
        setLocalFilter={setLocalFilter}
        query={query}
      />
      <JobHistoryContent
        job={job}
        query={query}
        jobs={jobs}
        repository={repository}
        highlightRunnerId={highlightRunnerId}
        onOpenRun={onOpenRun}
        expanded={expanded}
        toggleJob={toggleJob}
        allJobs={allJobs}
        messages={messages}
      />
    </section>
  );
}
