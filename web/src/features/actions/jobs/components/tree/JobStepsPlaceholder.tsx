import { LoadingPlaceholder } from '../../../../../shared/ui/loading/components/LoadingPlaceholder';

export function JobStepsPlaceholder({ selectedJob }: { selectedJob: boolean }) {
  if (selectedJob) return <LoadingPlaceholder kind="steps" />;
  return 'Select this job to load steps';
}
