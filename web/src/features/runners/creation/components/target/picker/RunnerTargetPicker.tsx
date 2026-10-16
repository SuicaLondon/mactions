import { useState } from 'react';

import { cn } from '../../../../../../shared/lib/cn';
import { useConnection } from '../../../../../github/hooks/use-connection';
import { useRunnerCreationStatus } from '../../../hooks/use-runner-creation-status';
import { useRunnerTargetDiscovery } from '../../../hooks/use-runner-target-discovery';
import { useRunnerCreationStore } from '../../../stores/runner-creation-store';
import { TargetDiscoveryAction } from './TargetDiscoveryAction';
import { TargetDiscoveryStatus } from './TargetDiscoveryStatus';
import { TargetSelect } from './TargetSelect';

export function RunnerTargetPicker() {
  const kind = useRunnerCreationStore((state) => state.kind);
  const target = useRunnerCreationStore((state) => state.target);
  const setTarget = useRunnerCreationStore((state) => state.setTarget);
  const { pending } = useRunnerCreationStatus();
  const connection = useConnection();
  const { discovery, options } = useRunnerTargetDiscovery();
  // Paging details stay hidden until the picker is opened or searched.
  const [browsed, setBrowsed] = useState(false);
  return (
    <div className="flex flex-col items-stretch gap-2">
      <TargetSelect
        kind={kind}
        options={options}
        value={target}
        onChange={setTarget}
        disabled={pending || !connection.data?.connected}
        loading={discovery.isFetching}
        onOpen={() => setBrowsed(true)}
      />
      <div
        className={cn(
          'flex h-11 items-center justify-between gap-2 text-xs',
          // A fixed height on every screen: a discovery error scrolls inside it, never growing it.
          'leading-snug text-muted',
        )}
        aria-live="polite"
      >
        <TargetDiscoveryStatus browsed={browsed} />
        <TargetDiscoveryAction browsed={browsed} />
      </div>
    </div>
  );
}
