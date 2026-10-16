import type { Capabilities } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { sentence } from '../../../../../shared/lib/sentence';
import { linkButtonClassName } from '../../../../../shared/ui/controls/buttons/link-button-class';
import { PendingLabel } from '../../../../../shared/ui/controls/buttons/PendingLabel';
import { UpdateFailedIndicator } from '../../../../../shared/ui/feedback/components/UpdateFailedIndicator';
import { AccessLinks } from './AccessLinks';
import { AccessSkeleton } from './AccessSkeleton';
import { CapabilityList } from './CapabilityList';

/** The access result with its re-check button, or why access cannot be checked. */
export function RunnerAccessCheck({
  connected,
  capabilities,
  error,
  loading,
  checking,
  onCheck,
}: {
  connected: boolean;
  capabilities: Capabilities | undefined;
  error: Error | null;
  /** No result yet. */
  loading: boolean;
  checking: boolean;
  onCheck: () => void;
}) {
  if (!connected)
    return (
      <p className="mx-0 mt-2 mb-0 text-xs/normal text-muted">
        Connect GitHub CLI from the account status in the header to check access.
      </p>
    );
  // A failed first check explains itself above the button that retries it. A failed re-check keeps
  // the last result and reports beside the button, so nothing moves.
  let loadError: Error | null = null;
  let checkError: Error | null = null;
  if (capabilities) checkError = error;
  else loadError = error;
  return (
    <>
      {!!loadError && (
        <p
          className={cn(
            'mx-0 my-2 rounded-md border border-danger/20 bg-danger/4 px-3',
            'py-2.5 text-xs/normal wrap-anywhere whitespace-pre-wrap text-danger',
          )}
          role="alert"
        >
          Couldn&apos;t check GitHub access. {sentence(loadError.message)} Use Check access again to
          retry.
        </p>
      )}
      {loading && <AccessSkeleton />}
      {!!capabilities && (
        <>
          <CapabilityList capabilities={capabilities} />
          <AccessLinks links={capabilities.links} />
        </>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          className={linkButtonClassName}
          disabled={checking}
          aria-busy={checking}
          onClick={onCheck}
        >
          <PendingLabel pending={checking} idle="Check access again" busy="Checking…" />
        </button>
        <UpdateFailedIndicator
          error={checkError}
          retrying={checking}
          onRetry={onCheck}
          label="Check failed"
        />
      </div>
    </>
  );
}
