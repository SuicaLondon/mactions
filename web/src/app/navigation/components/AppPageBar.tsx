import { cn } from '../../../shared/lib/cn';
import { ChevronIcon } from '../../../shared/ui/icons/ChevronIcon';
import { useCurrentPage } from '../hooks/use-current-page';
import { useRunSelectionUpdate } from '../hooks/use-run-selection-update';
import { backDestination, compactPageHeading } from '../models/app-navigation';
import { useNavigationStore } from '../stores/navigation-store';
import { AppBreadcrumbs } from './AppBreadcrumbs';

/**
 * Detail pages add Back and breadcrumbs in a row below the header instead of replacing it. Phones
 * replace the breadcrumbs with the full selected Job or Step name on a second line; pages whose
 * content already shows their name in full omit it.
 */
export function AppPageBar() {
  const page = useCurrentPage();
  const pages = useNavigationStore((state) => state.pages);
  const view = useNavigationStore((state) => state.preferences.view);
  const goBack = useNavigationStore((state) => state.goBack);
  const updateRunSelection = useRunSelectionUpdate();
  if (page.type === 'list') return null;
  const destination = backDestination(pages, view);
  const heading = compactPageHeading(page, view);
  function back() {
    switch (destination.type) {
      case 'job':
        updateRunSelection({ jobId: destination.jobId });
        return;
      case 'run':
        updateRunSelection({ jobId: null });
        return;
      case 'page':
        goBack();
        return;
    }
  }
  return (
    <div
      className={cn(
        'flex min-h-10 shrink-0 items-center gap-2 border-b border-line',
        'bg-surface px-4 py-1 max-md:flex-wrap max-md:gap-y-1 max-sm:px-3',
      )}
    >
      <button
        className={cn(
          'min-h-7 max-w-60 shrink-0 bg-surface py-1 pr-2.5 pl-1.75',
          'text-xs font-medium max-md:min-h-10 max-md:max-w-full',
          'pointer-coarse:min-h-10',
        )}
        aria-label="Back"
        title={`Back to ${destination.label}`}
        onClick={back}
      >
        <ChevronIcon className="size-4.25 rotate-180" />
        <span className="overflow-hidden text-ellipsis">Back to {destination.label}</span>
      </button>
      <AppBreadcrumbs />
      {!!heading && (
        <p
          className={cn(
            'm-0 basis-full px-1.75 pt-1 pb-1.5 text-sm font-semibold',
            'wrap-anywhere text-foreground md:hidden',
          )}
        >
          {heading}
        </p>
      )}
    </div>
  );
}
