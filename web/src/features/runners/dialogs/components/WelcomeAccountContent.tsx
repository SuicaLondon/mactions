import { type Connection } from '../../../../shared/api/types';
import { cn } from '../../../../shared/lib/cn';
import { GitHubAccountPanel } from '../../../github/components/account/GitHubAccountPanel';

/** The welcome dialog once GitHub is connected: the account, with its permissions and scopes. */
export function WelcomeAccountContent({
  titleId,
  connection,
  onClose,
  onUseToken,
}: {
  titleId: string;
  connection: Connection;
  onClose: () => void;
  onUseToken: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <h2 id={titleId} className="m-0">
        GitHub account
      </h2>
      <GitHubAccountPanel connection={connection} />
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 border-t border-t-line pt-4',
          'max-sm:flex-col-reverse max-sm:items-stretch',
          // Phones keep the actions pinned to the bottom of the scrolling dialog, like Add runner.
          'max-md:sticky max-md:bottom-0 max-md:-mx-6 max-md:-mb-6 max-md:bg-toolbar',
          'max-md:px-6 max-md:pb-6',
        )}
      >
        <button type="button" className="text-xs" onClick={onUseToken}>
          Use a registration token
        </button>
        <button type="button" className="min-w-19.5 text-xs" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
