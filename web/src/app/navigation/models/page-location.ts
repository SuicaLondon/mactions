import type { WorkflowRun } from '../../../features/actions/data/types/activity-types';
import type { RunnerSelection } from '../../../features/runners/list/models/runner-list';
import type { Job } from '../../../shared/api/types';
import type { Page, PageContent } from './app-navigation';
import type { AppPreferences } from './app-preferences';

type View = AppPreferences['view'];
type Params = Record<string, number | string | undefined>;

/** The page stack and list view a URL describes. */
export interface PageLocation {
  view: View;
  pages: PageContent[];
}

const list: PageContent = { type: 'list' };

function path(segments: (number | string)[], params: Params = {}) {
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(name, String(value));
  }
  let hash = `#/${segments.map((segment) => encodeURIComponent(String(segment))).join('/')}`;
  const query = search.toString();
  if (query) hash += `?${query}`;
  return hash;
}

function runnerParams(runner: RunnerSelection | undefined): Params {
  if (!runner?.githubId) return {};
  return { runner: runner.githubId, local: runner.localId, runnerName: runner.name };
}

function viewParam(view: View, natural: View): Params {
  if (view === natural) return {};
  return { view };
}

function runSegments(repository: string, runId: number) {
  return ['runs', ...repository.split('/'), runId];
}

function historyLocation(pages: Page[], view: View) {
  const page = pages[pages.length - 1];
  if (page.type !== 'history') return pageLocation(pages.slice(0, -1), view);
  const parent = pages.at(-2);
  let runId = page.job.run_id ?? undefined;
  let attempt = page.job.run_attempt ?? undefined;
  if (parent?.type === 'run') {
    runId = parent.run.id;
    attempt = parent.run.attempt;
  }
  if (!runId) return pageLocation(pages.slice(0, -1), view);
  let natural: View = 'runs';
  if (page.runner?.githubId) natural = 'runners';
  return path([...runSegments(page.repository, runId), 'jobs', page.job.id, 'history'], {
    attempt,
    ...runnerParams(page.runner),
    workflow: page.job.workflow_id,
    name: page.job.name,
    ...viewParam(view, natural),
  });
}

/** Serializes the current page, with the context needed to rebuild its parents, as a URL hash. */
export function pageLocation(pages: Page[], view: View): string {
  const page = pages.at(-1);
  if (!page) return path([view]);
  switch (page.type) {
    case 'list':
      return path([view]);
    case 'runner': {
      const params = { runnerName: page.runner.name, ...viewParam(view, 'runners') };
      if (page.runner.githubId) {
        return path(['runners', page.runner.githubId], { local: page.runner.localId, ...params });
      }
      if (page.runner.localId) return path(['runners', 'local', page.runner.localId], params);
      return path([view]);
    }
    case 'diagnostics':
      if (!page.runner.localId) return path([view]);
      return path(['runners', 'local', page.runner.localId, 'logs'], {
        runnerName: page.runner.name,
        ...viewParam(view, 'runners'),
      });
    case 'run': {
      const segments = runSegments(page.run.repository, page.run.id);
      if (page.selectedJobId !== undefined) segments.push('jobs', page.selectedJobId);
      let step: number | undefined;
      if (page.selectedJobId !== undefined) step = page.selectedStepNumber;
      let natural: View = 'runs';
      if (page.runner?.githubId) natural = 'runners';
      return path(segments, {
        attempt: page.run.attempt,
        step,
        ...runnerParams(page.runner),
        ...viewParam(view, natural),
      });
    }
    case 'history':
      return historyLocation(pages, view);
  }
}

const ID = /^[1-9]\d{0,15}$/;

function id(value: string | null | undefined) {
  if (!value || !ID.test(value)) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return undefined;
  return parsed;
}

/** A Run known only by its URL; its summary fields fill in once the Run loads. */
export function placeholderRun(repository: string, runId: number, attempt: number): WorkflowRun {
  return {
    id: runId,
    repository,
    workflow_id: 0,
    name: '',
    title: '',
    number: 0,
    attempt,
    status: '',
    conclusion: null,
    branch: '',
    head_sha: '',
    url: '',
    created_at: null,
    started_at: null,
    updated_at: null,
  };
}

export function isPlaceholderRun(run: WorkflowRun) {
  return !run.name;
}

function placeholderJob(options: {
  repository: string;
  jobId: number;
  name: string;
  workflowId?: number;
  runId: number;
  attempt: number;
}): Job {
  return {
    id: options.jobId,
    name: options.name,
    status: '',
    conclusion: null,
    started_at: null,
    completed_at: null,
    workflow: '',
    branch: '',
    run_number: 0,
    url: '',
    steps: [],
    run_id: options.runId,
    run_attempt: options.attempt,
    repository: options.repository,
    workflow_id: options.workflowId,
  };
}

function runnerSelection(
  githubId: number | undefined,
  localId: number | undefined,
  name: string | null,
): RunnerSelection | undefined {
  if (!githubId && !localId) return undefined;
  let key = `github-${githubId}`;
  if (localId) key = `local-${localId}`;
  let label = name;
  if (!label) label = `Runner ${githubId ?? localId}`;
  return { key, githubId, localId, name: label };
}

function parseRunners(rest: string[], params: URLSearchParams): PageContent[] | null {
  const name = params.get('runnerName');
  if (rest.length === 0) return [list];
  if (rest[0] === 'local') {
    const runner = runnerSelection(undefined, id(rest[1]), name);
    if (!runner) return null;
    if (rest.length === 2) return [list, { type: 'runner', runner }];
    if (rest.length === 3 && rest[2] === 'logs') return [list, { type: 'diagnostics', runner }];
    return null;
  }
  const runner = runnerSelection(id(rest[0]), id(params.get('local')), name);
  if (!runner || rest.length !== 1) return null;
  return [list, { type: 'runner', runner }];
}

function parseRuns(rest: string[], params: URLSearchParams): PageContent[] | null {
  if (rest.length === 0) return [list];
  const [owner, name, runSegment, jobsSegment, jobSegment, historySegment] = rest;
  const runId = id(runSegment);
  if (!owner || !name || !runId || rest.length > 6) return null;
  const repository = `${owner}/${name}`;
  const attempt = id(params.get('attempt')) ?? 1;
  const runner = runnerSelection(
    id(params.get('runner')),
    id(params.get('local')),
    params.get('runnerName'),
  );
  const pages: PageContent[] = [list];
  if (runner?.githubId) pages.push({ type: 'runner', runner });
  let context: RunnerSelection | undefined;
  if (runner?.githubId) context = runner;
  const run: Extract<PageContent, { type: 'run' }> = {
    type: 'run',
    run: placeholderRun(repository, runId, attempt),
    runner: context,
  };
  pages.push(run);
  if (rest.length === 3) return pages;
  const jobId = id(jobSegment);
  if (jobsSegment !== 'jobs' || !jobId) return null;
  run.selectedJobId = jobId;
  if (rest.length === 5) {
    run.selectedStepNumber = id(params.get('step'));
    return pages;
  }
  if (historySegment !== 'history') return null;
  const jobName = params.get('name');
  // Without the exact Job name there is no History to compare, so the Job itself opens.
  if (!jobName) return pages;
  pages.push({
    type: 'history',
    job: placeholderJob({
      repository,
      jobId,
      name: jobName,
      workflowId: id(params.get('workflow')),
      runId,
      attempt,
    }),
    repository,
    runner: context,
  });
  return pages;
}

function splitHash(hash: string) {
  const query = hash.indexOf('?');
  if (query < 0) return { pathname: hash.slice(2), search: '' };
  return { pathname: hash.slice(2, query), search: hash.slice(query + 1) };
}

/** Reads a URL hash back into its page stack; returns null for anything it does not describe. */
export function parseLocation(hash: string): PageLocation | null {
  if (!hash.startsWith('#/')) return null;
  const { pathname, search } = splitHash(hash);
  const params = new URLSearchParams(search);
  let segments: string[];
  try {
    segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return null;
  }
  let pages: PageContent[] | null = null;
  let view: View = 'runs';
  if (segments[0] === 'runners') {
    pages = parseRunners(segments.slice(1), params);
    view = 'runners';
  } else if (segments[0] === 'runs') {
    pages = parseRuns(segments.slice(1), params);
    if (pages?.some((page) => page.type === 'runner')) view = 'runners';
  }
  if (!pages) return null;
  const requested = params.get('view');
  if (requested === 'runners' || requested === 'runs') view = requested;
  return { view, pages };
}

/** Names what a page shows, ignoring selections within it, so URL and history pages can match. */
export function pageIdentity(page: PageContent) {
  switch (page.type) {
    case 'list':
      return 'list';
    case 'runner':
      return `runner:${page.runner.githubId ?? ''}:${page.runner.localId ?? ''}`;
    case 'diagnostics':
      return `diagnostics:${page.runner.localId ?? ''}`;
    case 'run':
      return [
        'run',
        page.run.repository,
        page.run.id,
        page.run.attempt,
        page.runner?.githubId ?? '',
      ].join(':');
    case 'history':
      return `history:${page.repository}:${page.job.id}`;
  }
}

function withSelection(existing: Page, target: PageContent): Page {
  if (existing.type !== 'run' || target.type !== 'run') return existing;
  const sameJob = existing.selectedJobId === target.selectedJobId;
  if (sameJob && existing.selectedStepNumber === target.selectedStepNumber) return existing;
  let selectedJobName: string | undefined;
  if (sameJob) selectedJobName = existing.selectedJobName;
  return {
    ...existing,
    selectedJobId: target.selectedJobId,
    selectedJobName,
    selectedStepNumber: target.selectedStepNumber,
    selectedStepName: undefined,
  };
}

/**
 * Moves the page stack to a URL's pages, keeping the pages both share so their keys, loaded
 * context, and History filters survive browser Back and Forward.
 */
export function mergeLocation(current: Page[], targets: PageContent[], nextKey: number) {
  const pages: Page[] = [];
  let key = nextKey;
  let shared = true;
  for (const [index, target] of targets.entries()) {
    const existing = current.at(index);
    if (shared && existing && pageIdentity(existing) === pageIdentity(target)) {
      pages.push(withSelection(existing, target));
      continue;
    }
    shared = false;
    key += 1;
    pages.push({ ...target, key });
  }
  const unchanged =
    pages.length === current.length && pages.every((page, index) => page === current[index]);
  if (unchanged) return { pages: current, nextKey };
  return { pages, nextKey: key };
}
