import { useReducer, useState } from 'react';

import { cn } from '../../../../shared/lib/cn';
import { useConnection } from '../../hooks/use-connection';
import { useGitHubAuthorization } from '../../hooks/use-github-authorization';
import {
  connectionPanelReducer,
  type ConnectionPanelVariant,
  connectionPanelVisibility,
  initialConnectionPanel,
  needsGitHubConnection,
} from '../../models/connection-panel';
import { DeviceCodeRow } from '../account/DeviceCodeRow';
import { AuthorizationForm } from './AuthorizationForm';
import { ConnectionContent } from './ConnectionContent';
import { ConnectionErrors } from './ConnectionErrors';
import { ConnectionSummary } from './ConnectionSummary';
import { ConnectionGuide } from './guide/ConnectionGuide';

const connectionClasses: Record<ConnectionPanelVariant, string> = {
  banner: 'border-b border-b-line bg-toolbar px-5.5 py-2.25',
  card: 'rounded-md border border-line bg-surface p-4 max-md:py-2.25',
};

export function GitHubConnection({
  variant,
  guide = false,
  organizationAccess = false,
  onUseToken,
  onContinueLocal,
  className,
}: {
  variant: ConnectionPanelVariant;
  /**
   * While GitHub needs connecting, opens with the first-run heading and the alternatives to
   * connecting, until the user hides them or continues locally.
   */
  guide?: boolean;
  /** Opens the settings with organization runner access preselected. */
  organizationAccess?: boolean;
  onUseToken?: () => void;
  onContinueLocal?: () => void;
  className?: string;
}) {
  const connection = useConnection();
  const [panel, dispatch] = useReducer(
    connectionPanelReducer,
    organizationAccess,
    initialConnectionPanel,
  );
  const [organizationScope, setOrganizationScope] = useState(organizationAccess);
  const authorization = useGitHubAuthorization({
    organizationScope,
    onStarted: () => dispatch({ type: 'authorizationStarted' }),
    onCompleted: () => dispatch({ type: 'authorizationCompleted' }),
  });
  const { pending } = authorization;
  const needsConnection = needsGitHubConnection(connection.isSuccess, connection.data);
  const { showGuide, showContent } = connectionPanelVisibility({
    guide,
    needsConnection,
    pending,
    ...panel,
  });
  return (
    <section
      className={cn('text-xs', connectionClasses[variant], className)}
      aria-label="GitHub connection"
    >
      <ConnectionSummary
        variant={variant}
        open={showContent}
        onToggle={() => dispatch({ type: 'toggled', visible: showContent })}
      />
      {showContent && (
        <ConnectionContent variant={variant} showHeading={showGuide}>
          {/* The form and the device code share one cell; starting or canceling swaps which
              is visible, so the banner never changes height. */}
          <div className="grid w-full">
            <div
              className={cn('col-start-1 row-start-1 min-w-0', { invisible: pending })}
              aria-hidden={pending || undefined}
              inert={pending}
            >
              <AuthorizationForm
                variant={variant}
                organizationScope={organizationScope}
                onOrganizationScopeChange={setOrganizationScope}
                starting={authorization.starting}
                onStart={authorization.start}
              />
            </div>
            <div
              className={cn('col-start-1 row-start-1 min-w-0', { invisible: !pending })}
              aria-hidden={!pending || undefined}
              inert={!pending}
            >
              <div className="flex flex-col items-start gap-2">
                <p className="m-0 leading-relaxed">
                  Enter this code on GitHub from any device. Keep this page open until it finishes.
                </p>
                <DeviceCodeRow
                  code={authorization.attempt?.code ?? null}
                  canceling={authorization.canceling}
                  onCancel={authorization.cancel}
                />
              </div>
            </div>
          </div>
          {needsConnection && (
            <div
              className={cn('w-full', { invisible: pending })}
              aria-hidden={pending || undefined}
              inert={pending}
            >
              <ConnectionGuide
                variant={variant}
                showAlternatives={guide}
                onContinueLocal={() => {
                  dispatch({ type: 'continuedLocally' });
                  onContinueLocal?.();
                }}
                onUseToken={onUseToken}
              />
            </div>
          )}
          <ConnectionErrors
            attempt={authorization.attempt}
            authorizationErrors={authorization.errors}
          />
        </ConnectionContent>
      )}
    </section>
  );
}
