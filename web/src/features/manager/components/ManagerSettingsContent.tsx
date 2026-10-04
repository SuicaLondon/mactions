import { InlineLoading } from '../../../shared/ui/loading/components/InlineLoading';
import type { useManagerSettings } from '../hooks/use-manager-settings';
import { ManagerNetworkSettings } from './ManagerNetworkSettings';

export function ManagerSettingsContent({
  settings,
  disabled,
}: {
  settings: ReturnType<typeof useManagerSettings>;
  disabled: boolean;
}) {
  if (settings.query.isPending)
    return <InlineLoading label="Loading manager settings" className="h-4.5 w-full" />;
  if (!settings.query.data)
    return (
      <div>
        <p role="alert" className="text-danger">
          {settings.query.error?.message ?? 'Could not load manager settings.'}
        </p>
        <button type="button" onClick={() => void settings.query.refetch()}>
          Try again
        </button>
      </div>
    );
  return (
    <ManagerNetworkSettings settings={settings} data={settings.query.data} disabled={disabled} />
  );
}
