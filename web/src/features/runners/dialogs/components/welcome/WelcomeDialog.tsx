import { useState } from 'react';

import { cn } from '../../../../../shared/lib/cn';
import { useConnection } from '../../../../github/hooks/connection/use-connection';
import { RunnerDialog } from '../RunnerDialog';
import { WelcomeMethodChoices } from './WelcomeMethodChoices';
import { WelcomePrimaryAction } from './WelcomePrimaryAction';
import { WelcomeRegistration } from './WelcomeRegistration';

export function WelcomeDialog({
  onClose,
  onUseToken,
}: {
  onClose: () => void;
  onUseToken: () => void;
}) {
  const connection = useConnection();
  const [method, setMethod] = useState<'cli' | 'token'>('cli');
  let description = 'Choose how to set up your GitHub runners.';
  let cliDescription = "Reuse this Mac's gh login or connect an account.";
  let closeLabel = 'Set up later';
  if (connection.data?.connected) {
    description = 'A GitHub account is already connected on this Mac.';
    cliDescription = `Use @${connection.data.login} from this Mac.`;
    closeLabel = 'Close';
  }

  return (
    <RunnerDialog title="Welcome to mactions" onClose={onClose}>
      {(titleId) => (
        <div className="welcome-content flex min-w-0 flex-col gap-5">
          <div className="dialog-heading m-0 text-center">
            <h2 id={titleId}>Welcome to mactions</h2>
            <p className="mx-auto my-0 max-w-none text-xs leading-normal text-muted">
              {description}
            </p>
          </div>
          <WelcomeMethodChoices
            method={method}
            cliDescription={cliDescription}
            onSelect={setMethod}
          />
          <WelcomeRegistration method={method} connection={connection} onClose={onClose} />
          <div
            className={cn(
              'dialog-actions m-0 flex flex-wrap justify-end gap-2 border-t border-t-line pt-4',
              'max-sm:flex-col-reverse',
            )}
          >
            <button
              type="button"
              onClick={onClose}
              className="min-w-19.5 text-xs whitespace-normal max-sm:w-full"
            >
              {closeLabel}
            </button>
            <WelcomePrimaryAction
              method={method}
              connected={connection.data?.connected === true}
              onUseToken={onUseToken}
              onClose={onClose}
            />
          </div>
        </div>
      )}
    </RunnerDialog>
  );
}
