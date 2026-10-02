import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { request } from './api';
import { Icon } from './Icon';
import { usePageVisible } from './use-runners';
import type { Job, JobLogs, JobStep } from './types';

function stateFor(status: string, conclusion: string | null) {
  const value = conclusion || status;
  const tone = value === 'success' ? 'success' : ['failure', 'timed_out', 'action_required', 'startup_failure'].includes(value) ? 'failure' : value === 'in_progress' ? 'running' : 'neutral';
  const icon = tone === 'success' ? 'check' : tone === 'failure' ? 'close' : tone === 'running' ? 'refresh' : value === 'skipped' ? 'minus' : 'clock';
  return { tone, icon, label: value === 'in_progress' ? 'Running' : value.replaceAll('_', ' ').replace(/^./, letter => letter.toUpperCase()) };
}

function duration(start?: string | null, end?: string | null, running = false, now = Date.now()) {
  if (!start || (!end && !running)) return '—';
  const seconds = Math.max(0, Math.floor(((end ? Date.parse(end) : now) - Date.parse(start)) / 1000));
  if (!Number.isFinite(seconds)) return '—';
  return `${seconds >= 3600 ? `${Math.floor(seconds / 3600)}h ` : ''}${seconds >= 60 ? `${Math.floor(seconds / 60) % 60}m ` : ''}${seconds % 60}s`;
}

function Timestamp({ value }: { value?: string | null }) {
  return value ? <time dateTime={value}>{new Date(value).toLocaleString()}</time> : <>—</>;
}

type ReplayLogs = { at: number; logs: Record<string, JobLogs> };

function LogViewer({ job, runnerId, repository, step, replay }: { job: Job; runnerId: number; repository: string; step?: JobStep; replay?: ReplayLogs }) {
  const visible = usePageVisible();
  const [wrap, setWrap] = useState(false);
  const query = useQuery({
    queryKey: ['job-logs', runnerId, repository, job.id, step?.number ?? 'all'],
    queryFn: ({ signal }) => request<JobLogs>(`/api/runners/${runnerId}/job-logs?repository=${encodeURIComponent(repository)}&job_id=${job.id}${step ? `&step_number=${step.number}` : ''}`, undefined, signal),
    enabled: visible && !replay,
    refetchInterval: query => visible && !replay && query.state.data?.state === 'pending' ? 15_000 : false,
    staleTime: 30_000,
    gcTime: 0,
  });
  const logs = replay ? { data: replay.logs[String(step?.number ?? 'all')] ?? { state: 'pending' as const, content: '', steps: [], message: 'No recorded output is available at this point.' }, isPending: false, isFetching: false, error: null } : query;
  const outputStep = logs.data?.scope === 'job' ? undefined : step;
  const label = outputStep ? `Logs for ${outputStep.name}` : `Full logs for ${job.name}`;
  function download() {
    if (!logs.data) return;
    const url = URL.createObjectURL(new Blob([logs.data.content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `job-${job.id}${outputStep ? `-step-${outputStep.number}` : ''}.log`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="job-log-viewer">
    <div className="job-log-toolbar"><span><Icon name="terminal"/>{outputStep ? 'Step output' : 'Full job output'}</span><div>
      {logs.data?.state === 'available' ? <><label><input type="checkbox" checked={wrap} onChange={event => setWrap(event.target.checked)}/>Wrap lines</label><button onClick={download}>Download</button></> : null}
      {!replay ? <button aria-label={`Refresh ${label.toLowerCase()}`} disabled={logs.isFetching} onClick={() => void query.refetch()}><Icon name="refresh"/>Refresh</button> : <span>Recorded output</span>}
      <a href={job.url} target="_blank" rel="noreferrer">GitHub<Icon name="external"/></a>
    </div></div>
    {logs.isPending && !logs.error ? <p className="job-log-message" role="status">Loading log output…</p> : logs.error ? <p className="job-log-message" role="alert">{logs.error.message}</p> : logs.data?.state !== 'available' ? <p className="job-log-message" role="status">{logs.data?.message || 'Log output is not available yet.'}</p> : <>
      {logs.data.message ? <p className="job-log-notice">{logs.data.message}</p> : null}
      <pre className={`job-log-content ${wrap ? 'wrap-lines' : ''}`} tabIndex={0} aria-label={label}>{logs.data.content.replace(/(?:\u001b|\^\[)\[[0-?]*[ -/]*[@-~]/g, '') || 'This log contains no output.'}</pre>
    </>}
  </div>;
}

function StepRow({ step, job, runnerId, repository, replay }: { step: JobStep; job: Job; runnerId: number; repository: string; replay?: ReplayLogs }) {
  const [expanded, setExpanded] = useState(step.status === 'in_progress' || step.conclusion === 'failure');
  const state = stateFor(step.status, step.conclusion);
  return <li className={`job-step-row ${state.tone}`} aria-current={step.status === 'in_progress' ? 'step' : undefined}>
    <button className="job-step-toggle" aria-label={`${step.name}, ${state.label}, ${duration(step.started_at, step.completed_at, step.status === 'in_progress', replay?.at)}`} aria-expanded={expanded} aria-controls={`job-${job.id}-step-${step.number}`} onClick={() => setExpanded(!expanded)}>
      <Icon name="chevron"/><span className={`step-symbol ${state.tone}`}><Icon name={state.icon}/></span><span className="step-name">{step.name}</span><span className={`step-status ${state.tone}`}>{state.label}</span><span className="step-duration">{duration(step.started_at, step.completed_at, step.status === 'in_progress', replay?.at)}</span>
    </button>
    {expanded ? <div id={`job-${job.id}-step-${step.number}`} className="step-output" role="region" aria-label={`Output for ${step.name}`}>
      <div className="step-timestamps"><span>Started <Timestamp value={step.started_at}/></span><span>Finished <Timestamp value={step.completed_at}/></span></div>
      {step.status === 'queued' || step.status === 'pending' || step.conclusion === 'skipped' ? <p className="job-log-message">{step.conclusion === 'skipped' ? 'This step was skipped.' : 'This step has not started yet.'}</p> : <LogViewer job={job} step={step} runnerId={runnerId} repository={repository} replay={replay}/>}
    </div> : null}
  </li>;
}

export function JobCard({ job, runnerId, repository, replay }: { job: Job; runnerId: number; repository: string; replay?: ReplayLogs }) {
  const [fullLog, setFullLog] = useState(false);
  const state = stateFor(job.status, job.conclusion);
  const completed = job.steps.filter(step => step.status === 'completed').length;
  const details = [
    ['Trigger', job.event?.replaceAll('_', ' ')], ['Actor', job.actor ? `@${job.actor}` : null],
    ['Triggered by', job.triggering_actor && job.triggering_actor !== job.actor ? `@${job.triggering_actor}` : null],
    ['Run', `#${job.run_number}${job.run_attempt ? ` · attempt ${job.run_attempt}` : ''}`],
    ['Duration', duration(job.started_at, job.completed_at, job.status === 'in_progress', replay?.at)],
    ['Runner', job.runner_name], ['Runner group', job.runner_group_name],
  ];
  return <article id={`job-${job.id}-details`} className={`job-card job-detail job-result-${state.tone} ${job.status !== 'completed' ? 'job-active' : ''}`} aria-label={job.name}>
    <header className="job-heading">
      <span className={`job-symbol ${state.tone}`}><Icon name={state.icon}/></span>
      <div className="job-title"><p>{job.workflow} <span>#{job.run_number}</span></p><h3><a href={job.url} target="_blank" rel="noreferrer">{job.name}<Icon name="external"/></a></h3></div>
      <span className={`job-status ${state.tone}`}>{state.label}</span>
    </header>
    <div className="job-detail-meta">
      {job.run_title ? <p className="job-run-title">{job.run_title}</p> : null}
      <div className="job-revision"><span><Icon name="branch"/>{job.branch || 'Unknown branch'}</span>{job.head_sha ? <code title={job.head_sha}>{job.head_sha.slice(0, 7)}</code> : null}{job.commit_message ? <span className="job-commit" title={job.commit_message}>{job.commit_message.split('\n')[0]}</span> : null}</div>
      <dl className="job-detail-grid">{details.filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}<div><dt>Started</dt><dd><Timestamp value={job.started_at}/></dd></div><div><dt>Finished</dt><dd><Timestamp value={job.completed_at}/></dd></div>{job.created_at ? <div><dt>Created</dt><dd><Timestamp value={job.created_at}/></dd></div> : null}</dl>
      {job.labels?.length ? <div className="job-runner-labels"><span>Runs on</span>{job.labels.map(label => <span key={label} className="label">{label}</span>)}</div> : null}
      <div className="job-detail-links">{job.run_url ? <a href={job.run_url} target="_blank" rel="noreferrer">Workflow run<Icon name="external"/></a> : null}{job.workflow_url ? <a href={job.workflow_url} target="_blank" rel="noreferrer">{job.workflow_path || 'Workflow file'}<Icon name="external"/></a> : null}<span>Job #{job.id}</span></div>
    </div>
    <div className="job-progress">
      <div className="job-output-heading"><h4>Steps <span>{completed}/{job.steps.length} completed</span></h4><button aria-expanded={fullLog} aria-controls={`job-${job.id}-full-log`} onClick={() => setFullLog(value => !value)}><Icon name="terminal"/>{fullLog ? 'Hide full log' : 'Full job log'}</button></div>
      {job.steps.length ? <progress aria-label={`Completed steps for ${job.name}`} max={job.steps.length} value={completed}/> : null}
      {fullLog ? <section id={`job-${job.id}-full-log`} aria-label="Full job output"><LogViewer job={job} runnerId={runnerId} repository={repository} replay={replay}/></section> : null}
      {job.steps.length ? <ol className="job-step-list">{job.steps.map(step => <StepRow key={step.number} step={step} job={job} runnerId={runnerId} repository={repository} replay={replay}/>)}</ol> : <p className="job-steps-empty">GitHub has not reported any steps for this job.</p>}
    </div>
  </article>;
}
