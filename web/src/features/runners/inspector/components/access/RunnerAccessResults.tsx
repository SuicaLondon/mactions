import { cn } from '../../../../../shared/lib/cn';
import { AccessLinks } from '../../../../../shared/ui/access/components/AccessLinks';
import { CapabilityList } from '../../../../../shared/ui/access/components/CapabilityList';
import type { useRunnerAccess } from '../../hooks/use-runner-access';

export function RunnerAccessResults({ access }: { access: ReturnType<typeof useRunnerAccess> }) {
  if (access.error) {
    return (
      <p
        className={cn(
          'error-message m-0 mx-0 rounded-md border border-red-500/20 bg-red-500/4 px-3',
          'py-2.5 text-xs leading-normal wrap-anywhere whitespace-pre-wrap text-danger',
        )}
        role="alert"
      >
        {access.error.message}
      </p>
    );
  }
  if (access.data) {
    return (
      <>
        <CapabilityList data={access.data} stacked />
        <AccessLinks links={access.data.links} stacked />
      </>
    );
  }
  return null;
}
