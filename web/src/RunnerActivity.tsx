import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { request } from './api';
import { JobCard } from './JobCard';
import { WorkflowGraph } from './WorkflowGraph';
import { Icon } from './Icon';
import { usePageVisible } from './use-runners';
import type { Jobs, LogSnapshot, Runner } from './types';

export function RunnerActivity({ runner, connected }: { runner: Runner; connected: boolean }) {
  const [tab, setTab] = useState<'logs' | 'jobs'>(runner.busy ? 'jobs' : 'logs');
  const [file, setFile] = useState('');
  const [live, setLive] = useState(true);
  const [follow, setFollow] = useState(true);
  const [repositoryInput, setRepositoryInput] = useState('');
  const [repository, setRepository] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const visible = usePageVisible();
  const output = useRef<HTMLPreElement>(null);
  const logs = useQuery({ queryKey: ['logs', runner.id, file], queryFn: ({ signal }) => request<LogSnapshot>(`/api/runners/${runner.id}/logs${file ? `?file=${encodeURIComponent(file)}` : ''}`, undefined, signal), enabled: visible && tab === 'logs', refetchInterval: visible && tab === 'logs' && live ? 2000 : false, gcTime: 0 });
  const jobs = useQuery({ queryKey: ['jobs', runner.id, repository], queryFn: ({ signal }) => request<Jobs>(`/api/runners/${runner.id}/jobs?repository=${encodeURIComponent(repository)}`, undefined, signal), enabled: visible && tab === 'jobs' && connected, refetchInterval: visible && tab === 'jobs' ? 30_000 : false, staleTime: 20_000, gcTime: 0 });
  useEffect(() => { if (follow && output.current) output.current.scrollTop = output.current.scrollHeight; }, [logs.data, follow]);
  const allJobs = jobs.data?.jobs ?? [];
  const selectedJob = allJobs.find(job => job.id === selectedJobId);
  return <section className="runner-activity" aria-label={`Activity for ${runner.name}`}>
    <div className="activity-header"><div className="activity-identity"><span className="activity-icon"><Icon name={tab === 'logs' ? 'terminal' : 'play'}/></span><div><h2>{tab === 'logs' ? 'Runner output' : 'Workflow jobs'}</h2><span className="activity-runner">{runner.name}</span></div></div><div className="segments" role="group" aria-label="Runner activity view">
      {(['jobs', 'logs'] as const).map(item => <button key={item} aria-pressed={tab === item} onClick={() => setTab(item)}>{item === 'logs' ? 'Logs' : 'Jobs'}</button>)}
    </div>{tab === 'jobs' && connected ? <button className="text-button" aria-label="Refresh jobs" disabled={jobs.isFetching} onClick={() => void jobs.refetch()}><Icon name="refresh"/>Refresh</button> : null}</div>
    {tab === 'logs' ? <>
      <div className="log-controls"><label htmlFor="log-file">Log file</label><select id="log-file" value={file} onChange={e => setFile(e.target.value)}><option value="">Latest runner log</option>{logs.data?.files.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}</select>
        <button className="log-live" aria-label={live ? 'Pause live updates' : 'Resume live updates'} aria-pressed={live} onClick={() => setLive(v => !v)}><Icon name={live ? 'pause' : 'play'}/>{live ? 'Live updates' : 'Updates paused'}</button><label className="checkbox-label"><input type="checkbox" checked={follow} onChange={e => setFollow(e.target.checked)}/>Follow output</label>
      </div>
      {logs.error ? <p className="error-message">{logs.error.message}</p> : <pre ref={output} className="log-output" tabIndex={0} aria-label="Runner log output">{logs.isPending ? 'Loading logs…' : logs.data?.content || 'No log output yet.'}</pre>}
      <p className="detail-help">{logs.data?.selected || 'Existing diagnostic and service logs'}{logs.data?.truncated ? ' · Showing the last 64 KiB' : ''}</p>
    </> : <div className="jobs-view">
      {!connected ? <p>Connect GitHub above to view jobs. Local controls and logs are still available.</p> : <>
        {runner.target.kind === 'org' ? <form className="job-repository" onSubmit={e => { e.preventDefault(); setRepository(repositoryInput.trim().replace(/^https:\/\/github\.com\//i, '').replace(/\/$/, '')); }}><label htmlFor="job-repository">Repository in {runner.target.name}</label><input id="job-repository" required placeholder={`${runner.target.name}/repository`} value={repositoryInput} onChange={e => setRepositoryInput(e.target.value)}/><button type="submit">View jobs</button></form> : null}
        {jobs.error ? <p className="error-message">{jobs.error.message}</p> : <>
          {jobs.isPending ? <p className="panel-empty">Loading jobs…</p> : jobs.data?.needs_repository ? <p className="panel-empty">Choose a repository to view jobs.</p> : null}
          {jobs.data?.jobs.length === 0 && !jobs.data.needs_repository ? <p className="panel-empty">No jobs found.</p> : null}
          {allJobs.length ? <>
            <div className="jobs-summary"><span>{jobs.data?.repository || runner.target.name}</span><span>Updates every 30s</span></div>
            <WorkflowGraph jobs={allJobs} selectedJobId={selectedJob?.id ?? null} onSelectJob={id => setSelectedJobId(current => current === id ? null : id)}/>
            {selectedJob ? <JobCard key={`${runner.id}:${selectedJob.id}`} job={selectedJob} runnerId={runner.id} repository={jobs.data?.repository || repository || runner.target.name}/> : null}
            <p className="jobs-footnote">{jobs.data?.message || 'Recent jobs assigned to this runner. Open a job on GitHub for full output.'}</p>
          </> : null}
        </>}
      </>}
    </div>}
  </section>;
}
