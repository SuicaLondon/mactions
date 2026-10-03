import { JobCard } from '../../../actions/jobs/components/card/JobCard';
import type { CIRecording } from '../../types/recording';
import type { RecordingPlayerState } from '../../types/recording-player';
import { WorkflowGraph } from '../graph/WorkflowGraph';

export function RecordingJobs({
  frame,
  selectedJob,
  setSelectedJobId,
  at,
  recording,
  logs,
}: {
  logs: RecordingPlayerState['logs'];
  frame: RecordingPlayerState['frame'];
  selectedJob: RecordingPlayerState['selectedJob'];
  setSelectedJobId: RecordingPlayerState['setSelectedJobId'];
  at: RecordingPlayerState['at'];
  recording: CIRecording;
}) {
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
    <p className="panel-empty m-0 grid flex-1 place-items-center p-5 text-muted">
      No jobs had been reported at this point in the recording.
    </p>
  );
}
