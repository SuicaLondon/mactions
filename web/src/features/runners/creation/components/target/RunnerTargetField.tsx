import { cn } from '../../../../../shared/lib/cn';
import { TargetSelect } from '../../../../github/components/targets/TargetSelect';
import { useRunnerCreationContext } from '../../hooks/use-runner-creation-context';
import { ManualRunnerTarget } from './ManualRunnerTarget';
import { TargetDiscoveryAction } from './TargetDiscoveryAction';
import { TargetDiscoveryStatus } from './TargetDiscoveryStatus';

export function RunnerTargetField() {
  const { usePicker, kind, options, target, setTarget, busy, connected, discovery, valid } =
    useRunnerCreationContext();
  if (usePicker) {
    return (
      <div className="target-selection flex flex-col items-stretch gap-2">
        <TargetSelect
          kind={kind}
          options={options}
          value={target}
          onChange={setTarget}
          disabled={busy || !connected}
          loading={discovery.isFetching}
        />
        <div
          className={cn(
            'target-select-status flex h-11 items-center justify-between gap-2 text-xs',
            'leading-snug text-muted',
          )}
          aria-live="polite"
        >
          <TargetDiscoveryStatus />
          <TargetDiscoveryAction />
        </div>
      </div>
    );
  }
  return (
    <ManualRunnerTarget
      kind={kind}
      target={target}
      onChange={setTarget}
      disabled={busy}
      valid={valid}
    />
  );
}
