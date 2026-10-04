import { InlineLoading } from '../../../shared/ui/loading/components/InlineLoading';
import type { useManagerUpdate } from '../hooks/use-manager-update';
import type { ManagerSettings } from '../types/manager';
import { ManagerUpdateStatus } from './ManagerUpdateStatus';

export function ManagerUpdatePanel({
  update,
  disabled,
  settings,
}: {
  update: ReturnType<typeof useManagerUpdate>;
  disabled: boolean;
  settings: ManagerSettings | undefined;
}) {
  const { check, start, status, running } = update;
  const currentVersion = check.data?.current_version ?? settings?.version;
  const installSource = check.data?.source ?? settings?.source;
  let source = 'Manual installation';
  if (installSource === 'script') source = 'Installer script';
  else if (installSource === 'homebrew') source = 'Homebrew';
  let updateLabel = 'Update mactions';
  if (running) updateLabel = 'Updating…';
  else if (check.data?.latest_version) updateLabel = `Update to ${check.data.latest_version}`;
  return (
    <section className="mt-6 border-t border-line pt-5" aria-labelledby="manager-update-title">
      <h3 id="manager-update-title" className="m-0 text-xs font-semibold">
        Version and updates
      </h3>
      {check.isPending && (
        <InlineLoading label="Checking for updates" className="mt-3 h-4.5 w-full" />
      )}
      {currentVersion && (
        <p className="my-3 text-xs text-muted">
          mactions {currentVersion} · {source}
        </p>
      )}
      {check.data && (
        <>
          {check.data.message && (
            <p className="my-2 text-xs leading-relaxed text-muted">{check.data.message}</p>
          )}
          {!check.data.can_update && check.data.source === 'manual' && (
            <p className="my-2 text-xs leading-relaxed text-muted">
              Use the installer script or Homebrew to enable managed updates.
            </p>
          )}
          {check.data.available && check.data.can_update && (
            <>
              <p className="my-2 text-xs leading-relaxed text-muted">
                The dashboard briefly restarts during an update. Runners continue running.
              </p>
              <button
                type="button"
                className="primary"
                disabled={disabled || running || status.isPending}
                onClick={() => start.mutate()}
              >
                {updateLabel}
              </button>
            </>
          )}
          {!check.data.available && !!check.data.latest_version && !running && (
            <p className="my-2 text-xs text-muted">You are using the latest available version.</p>
          )}
        </>
      )}
      {check.isError && (
        <p role="alert" className="my-2 text-xs text-danger">
          {check.error.message}
        </p>
      )}
      <button
        type="button"
        className="mt-2"
        disabled={disabled || check.isFetching || running}
        onClick={() => void check.refetch()}
      >
        Check for updates
      </button>
      <ManagerUpdateStatus update={update} />
    </section>
  );
}
