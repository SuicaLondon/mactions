import { cn } from '../../../../shared/lib/cn';
import type { useScopeTargets } from '../../hooks/targets/use-scope-targets';

export function ScopePickerFooter({
  query,
}: {
  query: ReturnType<typeof useScopeTargets>['query'];
}) {
  if (query.error)
    return (
      <p
        className={cn(
          'error-message m-0 rounded-md border border-red-500/20 bg-red-500/4 px-3 py-2.5',
          'text-xs leading-normal wrap-anywhere whitespace-normal text-danger',
        )}
        role="status"
      >
        {query.error.message}
      </p>
    );
  return undefined;
}
