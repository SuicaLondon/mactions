import { useState } from 'react';

import { useRunnerAccess } from '../../hooks/use-runner-access';
import { RunnerAccessCheck } from './RunnerAccessCheck';

interface RunnerAccessProps {
  runnerId: number;
  connected: boolean;
}

/** What GitHub lets this device do with the runner, checked only while the section is open. */
export function RunnerAccess({ runnerId, connected }: RunnerAccessProps) {
  const [open, setOpen] = useState(false);
  // Watching while closed keeps the last result for the next open without fetching again.
  const access = useRunnerAccess(runnerId, open && connected);
  return (
    <details
      className="mx-0 mb-3 border-t border-t-line px-4.5 py-3.75"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="text-xs font-medium">GitHub access</summary>
      {!!open && (
        <div className="pt-2.5">
          <RunnerAccessCheck
            connected={connected}
            capabilities={access.data}
            error={access.error}
            loading={access.isPending}
            checking={access.isFetching}
            onCheck={() => void access.refetch()}
          />
        </div>
      )}
    </details>
  );
}
