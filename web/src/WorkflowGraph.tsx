import { Icon } from './Icon';
import type { Job } from './types';

interface WorkflowGraphProps {
  jobs: Job[];
  selectedJobId: number | null;
  onSelectJob: (id: number) => void;
  at?: number;
}

function jobState(job: Job) {
  const value = job.conclusion || job.status;
  const tone = value === 'success' ? 'success' : ['failure', 'timed_out', 'action_required', 'startup_failure'].includes(value) ? 'failure' : value === 'in_progress' ? 'running' : 'neutral';
  const icon = tone === 'success' ? 'check' : tone === 'failure' ? 'close' : tone === 'running' ? 'refresh' : value === 'skipped' ? 'minus' : 'clock';
  const label = value === 'in_progress' ? 'Running' : value.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase());
  return { tone, icon, label };
}

function elapsed(job: Job, at: number) {
  if (!job.started_at) return 'Not started';
  const started = Date.parse(job.started_at);
  const ended = job.completed_at ? Date.parse(job.completed_at) : at;
  if (!Number.isFinite(started) || !Number.isFinite(ended)) return '';
  const seconds = Math.max(0, Math.floor((ended - started) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
}

function groupRuns(jobs: Job[]) {
  const groups = new Map<string, Job[]>();
  for (const job of jobs) {
    const key = JSON.stringify([job.run_id ?? [job.workflow, job.run_number], job.run_attempt ?? 1]);
    const group = groups.get(key);
    if (group) group.push(job);
    else groups.set(key, [job]);
  }
  return [...groups.entries()]
    .map(([key, runJobs]) => ({ key, jobs: runJobs.sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed')) }))
    .sort((a, b) => Number(a.jobs.every(job => job.status === 'completed')) - Number(b.jobs.every(job => job.status === 'completed')));
}

export function WorkflowGraph({ jobs, selectedJobId, onSelectJob, at = Date.now() }: WorkflowGraphProps) {
  const runs = groupRuns(jobs);
  return <section className="workflow-graph" aria-label="Workflow graph">
    <header className="workflow-graph-heading"><div><h3>Workflow graph</h3><p>Runs and assigned jobs</p></div><span>{runs.length} {runs.length === 1 ? 'run' : 'runs'} · {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}</span></header>
    <div className="workflow-graph-viewport" tabIndex={0} aria-label="Workflow graph canvas">
      <ul className="workflow-graph-runs">
        {runs.map(run => {
          const first = run.jobs[0];
          const running = run.jobs.filter(job => job.status === 'in_progress').length;
          const runLabel = `${first.workflow || 'Workflow'} #${first.run_number}${first.run_attempt && first.run_attempt > 1 ? ` · attempt ${first.run_attempt}` : ''}`;
          return <li key={run.key} className="workflow-graph-run" aria-label={runLabel}>
            <div className="workflow-graph-source">
              <span className="workflow-graph-source-icon"><Icon name="branch"/></span>
              <div className="workflow-graph-source-copy"><span>Run #{first.run_number}{first.run_attempt && first.run_attempt > 1 ? ` · Attempt ${first.run_attempt}` : ''}</span><h4>{first.workflow || 'Workflow'}</h4><p title={first.branch}>{first.branch || 'Unknown branch'}</p><small>{run.jobs.length} {run.jobs.length === 1 ? 'job' : 'jobs'}{running ? ` · ${running} running` : ''}</small></div>
            </div>
            <ul className="workflow-graph-jobs" aria-label={`Jobs in ${runLabel}`}>
              {run.jobs.map(job => {
                const state = jobState(job);
                const current = job.steps.find(step => step.status === 'in_progress');
                const completed = job.steps.filter(step => step.status === 'completed').length;
                return <li key={job.id} className="workflow-graph-job">
                  <button className={`workflow-graph-node ${state.tone}`} aria-label={`${job.name}, ${state.label}, ${runLabel}`} aria-expanded={selectedJobId === job.id} aria-controls={selectedJobId === job.id ? `job-${job.id}-details` : undefined} onClick={() => onSelectJob(job.id)}>
                    <span className={`workflow-graph-state ${state.tone}`}><Icon name={state.icon}/></span>
                    <span className="workflow-graph-node-copy"><strong title={job.name}>{job.name}</strong><span className="workflow-graph-node-meta"><span>{state.label}</span><span>{elapsed(job, at)}</span></span>{job.steps.length ? <small title={current?.name}>{current ? current.name : `${completed}/${job.steps.length} steps completed`}</small> : null}</span>
                    <Icon className="workflow-graph-open" name="chevron"/>
                  </button>
                </li>;
              })}
            </ul>
          </li>;
        })}
      </ul>
    </div>
  </section>;
}
