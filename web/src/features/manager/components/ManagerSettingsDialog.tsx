import { ModalDialog } from '../../../shared/ui/dialog/components/ModalDialog';
import { useManagerRestartWatch } from '../hooks/use-manager-restart-watch';
import { useManagerSettingsSaveStatus } from '../hooks/use-manager-settings-save-status';
import { useManagerUpdateRun } from '../hooks/use-manager-update-run';
import { ManagerSettingsContent } from './ManagerSettingsContent';
import { ManagerUpdatePanel } from './update/ManagerUpdatePanel';
import { ManagerUpdateReport } from './update/ManagerUpdateReport';

export function ManagerSettingsDialog({
  onClose,
  onReload,
}: {
  onClose: () => void;
  onReload: () => void;
}) {
  const restartStalled = useManagerRestartWatch(onReload);
  const save = useManagerSettingsSaveStatus();
  const update = useManagerUpdateRun(onReload);
  return (
    <ModalDialog onClose={onClose}>
      {(titleId) => (
        <>
          <h2 id={titleId}>Settings</h2>
          <ManagerSettingsContent disabled={update.running} restartStalled={restartStalled} />
          <ManagerUpdatePanel
            disabled={save.pending || save.restarting}
            running={update.running}
            statusLoading={update.statusLoading}
            onStart={update.start}
          />
          <div className="mt-6 flex justify-end">
            <button type="button" className="min-w-19.5 text-xs" onClick={onClose}>
              Done
            </button>
          </div>
          {/* Update progress and failures appear below the actions, so they never move Done. */}
          <ManagerUpdateReport progress={update.progress} />
        </>
      )}
    </ModalDialog>
  );
}
