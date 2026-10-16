import { useState } from 'react';

import { JobCard } from '../../../actions/jobs/components/card/JobCard';
import { useReplayJobLogs } from '../../hooks/use-replay-job-logs';
import { replayFrameAt, replaySelectedJob } from '../../models/recording-playback';
import { type CIRecording } from '../../types/recording';
import { WorkflowGraph } from '../graph/WorkflowGraph';

interface RecordingJobsProps {
  recording: CIRecording;
  at: number;
}

/** The jobs reported at the current moment, with the selected job's card and recorded logs. */
export function RecordingJobs({ recording, at }: RecordingJobsProps) {
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const frame = replayFrameAt(recording, at);
  const selectedJob = replaySelectedJob(frame.jobs, selectedJobId);
  const logs = useReplayJobLogs(recording, selectedJob, at);
  if (frame.jobs.length)
    return (
      <>
        <WorkflowGraph
          jobs={frame.jobs}
          selectedJobId={selectedJob?.id ?? null}
          onSelectJob={setSelectedJobId}
          at={at}
        />
        {!!selectedJob && (
          <JobCard
            key={selectedJob.id}
            job={selectedJob}
            runnerId={0}
            repository={recording.repository}
            replay={{ at, logs }}
          />
        )}
      </>
    );
  return (
    <p className="m-0 grid flex-1 place-items-center p-5 text-muted">
      No jobs had been reported at this point in the recording.
    </p>
  );
}
