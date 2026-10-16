import { ServerIcon } from '../../../shared/ui/icons/ServerIcon';
import { AppViewControl } from './AppViewControl';

/** The app title and Runners/Runs control stay in the header on every page. */
export function AppNavigation() {
  return (
    <>
      <div className="mx-0 mb-0 flex items-center gap-2">
        <span className="grid h-5.5 w-5 place-items-center text-muted">
          <ServerIcon className="size-4.5 stroke-2" />
        </span>
        <h1 className="text-xs max-sm:sr-only">mactions</h1>
      </div>
      <AppViewControl />
    </>
  );
}
