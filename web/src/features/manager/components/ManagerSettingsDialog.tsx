import { useManagerDialog } from '../hooks/use-manager-dialog';
import { useManagerSettings } from '../hooks/use-manager-settings';
import { useManagerUpdate } from '../hooks/use-manager-update';
import { ManagerSettingsContent } from './ManagerSettingsContent';
import { ManagerUpdatePanel } from './ManagerUpdatePanel';

export function ManagerSettingsDialog({
  onClose,
  onReload,
}: {
  onClose: () => void;
  onReload: () => void;
}) {
  const { ref, titleId } = useManagerDialog();
  const settings = useManagerSettings(onReload);
  const update = useManagerUpdate(onReload);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <h2 id={titleId}>Manager settings</h2>
      <ManagerSettingsContent settings={settings} disabled={update.running} />
      <ManagerUpdatePanel
        update={update}
        settings={settings.query.data}
        disabled={settings.save.isPending || settings.restarting}
      />
      <div className="mt-6 flex justify-end">
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </dialog>
  );
}
