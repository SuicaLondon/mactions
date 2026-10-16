import { cn } from '../../../../shared/lib/cn';
import { PendingLabel } from '../../../../shared/ui/controls/buttons/PendingLabel';
import { useConnection } from '../../hooks/use-connection';
import type { ConnectionPanelVariant } from '../../models/connection-panel';

const scopeLabelClasses: Record<ConnectionPanelVariant, string> = {
  banner: 'my-2 mr-2.5 ml-0 items-center',
  card: 'm-0 items-start leading-normal',
};

const scopeInputClasses: Record<ConnectionPanelVariant, string> = {
  banner: 'min-h-auto',
  card: 'mt-0.5 min-h-auto shrink-0',
};

interface AuthorizationFormProps {
  variant: ConnectionPanelVariant;
  organizationScope: boolean;
  onOrganizationScopeChange: (organizationScope: boolean) => void;
  starting: boolean;
  onStart: () => void;
}

export function AuthorizationForm({
  variant,
  organizationScope,
  onOrganizationScopeChange,
  starting,
  onStart,
}: AuthorizationFormProps) {
  const connected = useConnection().data?.connected;
  let idle = 'Start GitHub authorization';
  if (connected) idle = 'Authorize GitHub again';
  return (
    <>
      <label className={cn('inline-flex gap-1.75 text-xs', scopeLabelClasses[variant])}>
        <input
          type="checkbox"
          checked={organizationScope}
          onChange={(event) => onOrganizationScopeChange(event.target.checked)}
          className={scopeInputClasses[variant]}
        />
        Request organization runner management access
      </label>
      <button type="button" className="button-primary" disabled={starting} onClick={onStart}>
        <PendingLabel pending={starting} idle={idle} busy="Starting…" />
      </button>
    </>
  );
}
