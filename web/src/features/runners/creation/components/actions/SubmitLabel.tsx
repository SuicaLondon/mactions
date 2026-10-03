import { cn } from '../../../../../shared/lib/cn';
import { LoadingSpinner } from '../../../../../shared/ui/loading/components/LoadingSpinner';
import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';

export function SubmitLabel() {
  const { create, waiting } = useRunnerCreationContext();
  if (create.isPending) {
    return (
      <>
        <span
          className={cn(
            'loading-spinner inline-block size-3.5 shrink-0 animate-spin rounded-full',
            'border-2 border-current border-r-transparent motion-reduce:animate-none',
          )}
          aria-hidden="true"
        />
        <span className="sr-only">Creating &amp; Starting…</span>
      </>
    );
  }
  if (waiting) return <LoadingSpinner label="Waiting to create runner…" />;
  return 'Next';
}
