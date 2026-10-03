import { minutesToSeconds, secondsToMinutes } from 'date-fns';

import { matchesStatus } from '../../shared/models/activity-status';
import type {
  ActivityRunner,
  ActivityRunners,
  ActivityRuns,
  JobHistoryPage,
  JobSummary,
  WorkflowRun,
} from '../types/activity-types';

export function activityPath(
  resource: string,
  values: Record<string, string | number | undefined>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== '') params.set(key, String(value));
  const path = `/api/activity/${resource}`;
  if (params.size) return `${path}?${params}`;
  return path;
}

export function refreshIntervalSeconds(
  pages: ({ refresh_after_seconds?: number } | undefined)[] = [],
) {
  return Math.max(
    30,
    pages.reduce((sum, page) => {
      const seconds = page?.refresh_after_seconds;
      if (seconds !== undefined && Number.isFinite(seconds)) return sum + Math.max(30, seconds);
      return sum + 30;
    }, 0),
  );
}

export function refreshIntervalLabel(seconds: number) {
  const rounded = Math.ceil(seconds);
  let minutes = secondsToMinutes(rounded);
  // Preserve floor rounding for negative inputs; date-fns truncates toward zero.
  if (rounded < minutesToSeconds(minutes)) minutes -= 1;
  const remainder = rounded - minutesToSeconds(minutes);
  if (!minutes) return `${rounded}s`;
  if (remainder) return `${minutes}m ${remainder}s`;
  return `${minutes}m`;
}

export function mergeRunnerPages(pages: ActivityRunners[] = []) {
  const runners = new Map<string, ActivityRunner>();
  for (const page of pages)
    for (const runner of page.runners) {
      const owner = runner.target?.name.split('/')[0].toLowerCase() ?? '';
      let key = `local:${runner.local_id}`;
      if (runner.local_id === null) key = `remote:${owner}:${runner.github_id}`;
      runners.set(key, runner);
    }
  return {
    runners: [...runners.values()],
    message: [...new Set(pages.map((page) => page.message).filter(Boolean))].join(' '),
  };
}

export function prepareRunList(pages: ActivityRuns[] = [], status = 'all', search = '') {
  const seen = new Set<string>();
  const searchText = search.toLowerCase();
  const allRuns = pages.flatMap((page) => page.runs);
  const runs = allRuns.filter((run) => {
    const key = `${run.repository}:${run.id}:${run.attempt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return (
      matchesStatus(run, status) &&
      (!searchText ||
        [run.name, run.title, run.repository, run.branch, String(run.number)].some((value) =>
          (value ?? '').toLowerCase().includes(searchText),
        ))
    );
  });
  return {
    allRuns,
    runs,
    messages: [...new Set(pages.map((page) => page.message).filter(Boolean))],
  };
}

export function prepareJobHistory(pages: JobHistoryPage[] = [], status = 'all') {
  const seen = new Set<number>();
  const allJobs = pages
    .flatMap((page) => page.jobs)
    .filter((job) => {
      if (seen.has(job.id)) return false;
      seen.add(job.id);
      return true;
    });
  return {
    allJobs,
    jobs: allJobs.filter((job) => matchesStatus(job, status)),
    messages: [...new Set(pages.map((page) => page.message).filter(Boolean))],
  };
}

export function jobRun(job: JobSummary): WorkflowRun | null {
  if (!job.run_id) return null;
  return {
    id: job.run_id,
    repository: job.repository,
    workflow_id: job.workflow_id,
    name: job.workflow,
    title: job.run_title || job.workflow,
    number: job.run_number,
    attempt: job.run_attempt ?? 1,
    status: job.status,
    conclusion: job.conclusion,
    branch: job.branch,
    head_sha: job.head_sha || '',
    url: job.run_url || job.url,
    created_at: job.created_at || null,
    started_at: job.started_at,
    updated_at: job.completed_at,
  };
}
