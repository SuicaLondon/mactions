import { PendingLabel } from '../../../../shared/ui/controls/buttons/PendingLabel';
import { ClampedMessage } from '../../../../shared/ui/feedback/components/ClampedMessage';
import { useCachedManagerSettings } from '../../hooks/use-cached-manager-settings';
import { useManagerUpdateCheck } from '../../hooks/use-manager-update-check';
import { ManagerCheckResult } from './ManagerCheckResult';
import { ManagerVersionLine } from './ManagerVersionLine';

interface ManagerUpdatePanelProps {
  /** Locks update actions while network settings are saving or restarting the manager. */
  disabled: boolean;
  running: boolean;
  statusLoading: boolean;
  onStart: () => void;
}

export function ManagerUpdatePanel({
  disabled,
  running,
  statusLoading,
  onStart,
}: ManagerUpdatePanelProps) {
  const check = useManagerUpdateCheck();
  const settings = useCachedManagerSettings();
  const currentVersion = check.data?.current_version ?? settings?.version;
  const installSource = check.data?.source ?? settings?.source;
  let source = 'Manual installation';
  if (installSource === 'script') source = 'Installer script';
  else if (installSource === 'homebrew') source = 'Homebrew';
  const updatable = Boolean(check.data?.available && check.data.can_update);
  let note: string | null = check.data?.message || null;
  if (!note && check.data && !check.data.can_update && check.data.source === 'manual') {
    note = 'Use the installer script or Homebrew to enable managed updates.';
  }
  if (!note && updatable) {
    note = 'The dashboard briefly restarts during an update. Runners continue running.';
  }
  let updateLabel = 'Update mactions';
  if (check.data?.latest_version) updateLabel = `Update to ${check.data.latest_version}`;
  return (
    <section className="mt-4 border-t border-line pt-4" aria-labelledby="manager-update-title">
      <h3 id="manager-update-title" className="m-0 text-xs font-semibold">
        Version and updates
      </h3>
      <ManagerVersionLine version={currentVersion} source={source} loading={check.isPending} />
      {/* Check for updates keeps its place; an available update adds its button to the right. */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || check.isFetching || running}
          onClick={() => void check.refetch()}
        >
          <PendingLabel pending={check.isFetching} idle="Check for updates" busy="Checking…" />
        </button>
        {!!updatable && (
          <button
            type="button"
            className="button-primary"
            disabled={disabled || running || statusLoading}
            onClick={onStart}
          >
            <PendingLabel pending={running} idle={updateLabel} busy="Updating…" />
          </button>
        )}
      </div>
      {/* Two reserved lines for every check outcome and update note, so none moves the dialog. */}
      <ClampedMessage live className="mt-2" textClassName="text-muted">
        <ManagerCheckResult
          fetching={check.isFetching}
          error={check.error}
          upToDate={
            check.isSuccess && !check.data.available && !!check.data.latest_version && !running
          }
          note={note}
          checkedAt={check.dataUpdatedAt}
        />
      </ClampedMessage>
    </section>
  );
}
