import type { Job } from '../../../../../shared/api/types';
import type { JobSummary } from '../../../data/types/activity-types';
import { type useJobTree } from '../../hooks/use-job-tree';
import type { JobSelection } from '../../types/job-selection';
import { JobStepsPlaceholder } from './JobStepsPlaceholder';
import { JobTreeStep } from './JobTreeStep';

export function JobTreeSteps({
  detail,
  selectedJob,
  selected,
  node,
  focused,
  setFocused,
  keyboard,
  job,
  onSelect,
}: {
  detail: Job | undefined;
  selectedJob: boolean;
  node: string;
  job: JobSummary;
  focused: string | null;
  setFocused: (node: string) => void;
  keyboard: ReturnType<typeof useJobTree>['keyboard'];
  selected: JobSelection | null;
  onSelect: (selection: JobSelection) => void;
}) {
  if (!detail) {
    return (
      <li className="job-tree-note pt-1.75 pr-2.5 pb-1.75 pl-0 text-xs text-muted" role="none">
        <JobStepsPlaceholder selectedJob={selectedJob} />
      </li>
    );
  }
  if (!detail.steps.length) {
    return (
      <li className="job-tree-note pt-1.75 pr-2.5 pb-1.75 pl-0 text-xs text-muted" role="none">
        No steps reported
      </li>
    );
  }
  return detail.steps.map((step, stepIndex) => (
    <JobTreeStep
      key={step.number}
      step={step}
      stepIndex={stepIndex}
      count={detail.steps.length}
      selectedJob={selectedJob}
      selected={selected}
      node={node}
      focused={focused}
      setFocused={setFocused}
      keyboard={keyboard}
      job={job}
      onSelect={onSelect}
    />
  ));
}
