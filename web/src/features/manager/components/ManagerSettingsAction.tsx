import { useState } from 'react';

import { ManagerSettingsDialog } from './ManagerSettingsDialog';

export function ManagerSettingsAction() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Settings
      </button>
      {open && (
        <ManagerSettingsDialog
          onClose={() => setOpen(false)}
          onReload={() => window.location.reload()}
        />
      )}
    </>
  );
}
