import { useState } from 'react';

import { cn } from '../../../../shared/lib/cn';
import { ModalDialog } from '../../../../shared/ui/dialog/components/ModalDialog';
import { useConnection } from '../../../github/hooks/use-connection';
import { ChoiceCard } from '../../shared/components/ChoiceCard';
import { WelcomeAccountContent } from './WelcomeAccountContent';
import { WelcomeMethodDetails } from './WelcomeMethodDetails';

export function WelcomeDialog({
  onClose,
  onUseToken,
}: {
  onClose: () => void;
  onUseToken: () => void;
}) {
  const connection = useConnection();
  const [method, setMethod] = useState<'cli' | 'token'>('cli');
  if (connection.data?.connected) {
    const account = connection.data;
    return (
      <ModalDialog onClose={onClose}>
        {(titleId) => (
          <WelcomeAccountContent
            titleId={titleId}
            connection={account}
            onClose={onClose}
            onUseToken={onUseToken}
          />
        )}
      </ModalDialog>
    );
  }
  return (
    <ModalDialog onClose={onClose}>
      {(titleId) => (
        <div className="flex min-w-0 flex-col gap-5">
          <div className="m-0 text-center">
            <h2 id={titleId}>Welcome to mactions</h2>
            <p className="mx-auto my-0 max-w-none text-xs/normal text-muted">
              Choose how to set up your GitHub runners.
            </p>
          </div>
          <div
            className="grid grid-cols-2 gap-3 max-sm:grid-cols-1"
            role="group"
            aria-label="GitHub setup method"
          >
            <ChoiceCard
              title="GitHub CLI"
              description="Reuse this Mac's gh login or connect an account."
              selected={method === 'cli'}
              onSelect={() => setMethod('cli')}
            />
            <ChoiceCard
              title="Registration token"
              description="Register a runner without GitHub login."
              selected={method === 'token'}
              onSelect={() => setMethod('token')}
            />
          </div>
          <WelcomeMethodDetails method={method} onContinueLocal={onClose} />
          <div
            className={cn(
              'm-0 flex flex-wrap justify-end gap-2 border-t border-t-line pt-4',
              'max-sm:flex-col-reverse',
            )}
          >
            <button
              type="button"
              onClick={onClose}
              className="min-w-19.5 text-xs whitespace-normal max-sm:w-full"
            >
              Set up later
            </button>
            {method === 'token' && (
              <button
                type="button"
                className="min-w-19.5 button-primary text-xs whitespace-normal max-sm:w-full"
                onClick={onUseToken}
              >
                Continue with registration token
              </button>
            )}
          </div>
        </div>
      )}
    </ModalDialog>
  );
}
