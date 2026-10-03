import { cn } from '../../../shared/lib/cn';
import { ChevronIcon } from '../../../shared/ui/icons/navigation/ChevronIcon';
import { ServerIcon } from '../../../shared/ui/icons/system/ServerIcon';
import { useNavigation } from '../hooks/use-navigation';
import { AppViewControl } from './AppViewControl';
import { AppBreadcrumbs } from './breadcrumbs/AppBreadcrumbs';

export function AppNavigation() {
  const { page, parent, pageLabel, goBack } = useNavigation();
  if (page.type === 'list') {
    return (
      <>
        <div className="app-title mx-0 mb-0 flex items-center gap-2">
          <span className="app-icon grid h-5.5 w-5 place-items-center text-muted">
            <ServerIcon className="size-4.5 stroke-2" />
          </span>
          <h1 className="text-xs">mactions</h1>
        </div>
        <AppViewControl />
      </>
    );
  }
  let parentLabel = 'Runners';
  if (parent) parentLabel = pageLabel(parent);
  return (
    <>
      <button
        className={cn(
          'page-back min-h-8 max-w-60 shrink-0 bg-surface pt-1.25 pr-2.5 pb-1.25 pl-1.75',
          'text-xs font-medium max-sm:max-w-40',
        )}
        aria-label="Back"
        title={`Back to ${parentLabel}`}
        onClick={goBack}
      >
        <ChevronIcon className="size-4.25 rotate-180" />
        <span className="overflow-hidden text-ellipsis">Back to {parentLabel}</span>
      </button>
      <AppBreadcrumbs />
    </>
  );
}
