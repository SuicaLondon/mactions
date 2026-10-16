import type { Jobs } from '../../../../shared/api/types';

/** Accepts `owner/repo` or a pasted GitHub URL, with or without a trailing slash. */
export function normalizeJobRepository(input: string) {
  return input
    .trim()
    .replace(/^https:\/\/github\.com\//i, '')
    .replace(/\/$/, '');
}

/** Selecting the open job again closes it. */
export function toggleSelectedJob(current: number | null, id: number) {
  if (current === id) return null;
  return id;
}

export function findSelectedJob(jobs: Jobs | undefined, selectedJobId: number | null) {
  return jobs?.jobs.find((job) => job.id === selectedJobId);
}
