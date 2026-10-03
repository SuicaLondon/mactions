import type { Runner } from '../../../../../shared/api/types';
import type { RunnerActivityState } from '../../models/runner-activity';
import { RunnerJobsResults } from './RunnerJobsResults';

interface RunnerJobsContentProps {
  runner: Runner;
  connected: boolean;
  activity: RunnerActivityState;
}

export function RunnerJobsContent({ runner, connected, activity }: RunnerJobsContentProps) {
  const { setRepository, repositoryInput, setRepositoryInput, jobs } = activity;
  if (!connected)
    return <p>Connect GitHub above to view jobs. Local controls and logs are still available.</p>;
  return (
    <>
      {!!(runner.target.kind === 'org') && (
        <form
          className="job-repository mx-0 my-2.5 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setRepository(
              repositoryInput
                .trim()
                .replace(/^https:\/\/github\.com\//i, '')
                .replace(/\/$/, ''),
            );
          }}
        >
          <label htmlFor="job-repository">Repository in {runner.target.name}</label>
          <input
            id="job-repository"
            required
            placeholder={`${runner.target.name}/repository`}
            value={repositoryInput}
            onChange={(e) => setRepositoryInput(e.target.value)}
            className="flex-1"
          />
          <button type="submit">View jobs</button>
        </form>
      )}
      <RunnerJobsResults
        jobs={jobs}
        allJobs={activity.allJobs}
        runner={runner}
        selectedJob={activity.selectedJob}
        setSelectedJobId={activity.setSelectedJobId}
        repository={activity.repository}
      />
    </>
  );
}
