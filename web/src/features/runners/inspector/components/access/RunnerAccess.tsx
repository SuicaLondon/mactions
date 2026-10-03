import { useState } from 'react';

import { useRunnerAccess } from '../../hooks/use-runner-access';
import { RunnerRegistrationHelp } from './RunnerRegistrationHelp';

export function RunnerAccess({ runnerId, connected }: { runnerId: number; connected: boolean }) {
  const [open, setOpen] = useState(false);
  const access = useRunnerAccess(runnerId, open && connected);
  return (
    <details
      className="detail-section runner-access mx-0 mb-3 border-t border-t-line px-4.5 py-3.75"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="text-xs font-medium">GitHub access</summary>
      {!!open && (
        <div className="runner-access-content pt-2.5">
          <RunnerRegistrationHelp connected={connected} access={access} />
        </div>
      )}
    </details>
  );
}
