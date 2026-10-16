import { useState } from 'react';

import { ManagerSettingsDialog } from './ManagerSettingsDialog';

export function ManagerSettingsAction() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="max-md:min-h-10 pointer-coarse:min-h-10"
        onClick={() => setOpen(true)}
      >
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
