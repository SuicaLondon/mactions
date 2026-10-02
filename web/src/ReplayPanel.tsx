import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { JobCard } from './JobCard';
import { WorkflowGraph } from './WorkflowGraph';
import { replayFrameAt, replayLogsForJob } from './recording';
import type { CIRecording } from './recording';

function duration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function ReplayPanel({ recording }: { recording: CIRecording }) {
  return <RecordingPlayer key={`${recording.run_id}:${recording.started_at}:${recording.finished_at}`} recording={recording}/>;
}

function RecordingPlayer({ recording }: { recording: CIRecording }) {
  const start = recording.frames[0].at;
  const end = Date.parse(recording.finished_at);
  const [at, setAt] = useState(start);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const frame = replayFrameAt(recording, at);
  const selectedJob = frame.jobs.find(job => job.id === selectedJobId) ?? frame.jobs.find(job => job.status === 'in_progress') ?? frame.jobs[0];
  const logAt = at >= end ? end : Math.floor(at / 1000) * 1000;
  const logs = useMemo(() => selectedJob ? replayLogsForJob(recording, selectedJob, logAt) : {}, [recording, selectedJob, logAt]);
  useEffect(() => {
    if (!playing) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = (now - previous) * speed;
      previous = now;
      setAt(current => Math.min(end, current + elapsed));
    }, 250);
    return () => window.clearInterval(timer);
  }, [playing, speed, end]);
  useEffect(() => { if (at >= end) setPlaying(false); }, [at, end]);
  return <div className="replay-panel">
    <section className="replay-controls" aria-label="Recording playback">
      <div className="replay-identity"><span className="replay-badge"><Icon name="clock"/>Recorded run</span><strong>{recording.repository}</strong><a href={`https://github.com/${recording.repository}/actions/runs/${recording.run_id}`} target="_blank" rel="noreferrer">Run #{recording.run_id}<Icon name="external"/></a></div>
      <div className="replay-transport">
        <button className="replay-play" aria-label={playing ? 'Pause replay' : 'Play replay'} disabled={end === start} onClick={() => { if (!playing && at >= end) setAt(start); setPlaying(value => !value); }}><Icon name={playing ? 'pause' : 'play'}/>{playing ? 'Pause' : at >= end ? 'Replay' : 'Play'}</button>
        <input type="range" min={0} max={end - start} step="any" value={Math.round(at - start)} aria-label="Replay timeline" aria-valuetext={`${duration(at - start)} of ${duration(end - start)}`} onChange={event => setAt(start + Number(event.target.value))} onKeyDown={event => {
          const offset = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1000 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1000 : event.key === 'PageUp' ? 10_000 : event.key === 'PageDown' ? -10_000 : null;
          if (event.key === 'Home' || event.key === 'End' || offset !== null) {
            event.preventDefault();
            setAt(current => event.key === 'Home' ? start : event.key === 'End' ? end : Math.max(start, Math.min(end, current + (offset ?? 0))));
          }
        }}/>
        <output className="replay-position">{duration(at - start)} <span>/ {duration(end - start)}</span></output>
        <label className="replay-speed">Speed<select aria-label="Playback speed" value={speed} onChange={event => setSpeed(Number(event.target.value))}>{[1, 4, 10].map(value => <option key={value} value={value}>{value}×</option>)}</select></label>
      </div>
      <div className="replay-caption"><time dateTime={new Date(at).toISOString()}>{new Date(at).toLocaleString()}</time><span>Recorded snapshots · {recording.frames.length} frames</span></div>
    </section>
    {frame.jobs.length ? <>
      <WorkflowGraph jobs={frame.jobs} selectedJobId={selectedJob?.id ?? null} onSelectJob={setSelectedJobId} at={at}/>
      {selectedJob ? <JobCard key={selectedJob.id} job={selectedJob} runnerId={0} repository={recording.repository} replay={{ at, logs }}/>: null}
    </> : <p className="panel-empty">No jobs had been reported at this point in the recording.</p>}
  </div>;
}
