import { ChevronIcon } from '../../../shared/ui/icons/ChevronIcon';
import { BreadcrumbLabel } from './BreadcrumbLabel';

/** The selected Job, and on the current page its selected Step. */
export function JobCrumb({
  jobName,
  stepName,
  stepSelected,
  current,
  onSelectJob,
}: {
  jobName: string;
  /** Known once the selected Step's Job has loaded. */
  stepName: string | undefined;
  stepSelected: boolean;
  current: boolean;
  onSelectJob: () => void;
}) {
  let onNavigate: (() => void) | undefined;
  if (current && stepSelected) onNavigate = onSelectJob;
  return (
    <>
      <BreadcrumbLabel label={jobName} current={current && !stepName} onNavigate={onNavigate} />
      {current && !!stepName && (
        <>
          <ChevronIcon className="size-3 shrink-0 text-muted opacity-55" />
          <BreadcrumbLabel label={stepName} current />
        </>
      )}
    </>
  );
}
