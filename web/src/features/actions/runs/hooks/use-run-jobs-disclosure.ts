import { useState } from 'react';

interface DisclosureChoice {
  jobId: number | null;
  open: boolean;
}

/**
 * Compact-layout Jobs disclosure. It opens by default on Overview and closes once a Job
 * is selected; a user's choice holds until the selected Job changes. A run with failures
 * starts collapsed, because the failure callout above it already links each failed Job.
 */
export function useRunJobsDisclosure(selectedJobId: number | null, hasFailures = false) {
  const [choice, setChoice] = useState<DisclosureChoice | null>(null);
  let open = selectedJobId === null && !hasFailures;
  if (choice?.jobId === selectedJobId) open = choice.open;
  const toggle = () => setChoice({ jobId: selectedJobId, open: !open });
  return { open, toggle };
}
