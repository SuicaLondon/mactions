import { cn } from '../../../shared/lib/cn';
import { ChevronIcon } from '../../../shared/ui/icons/ChevronIcon';
import { InlineLoading } from '../../../shared/ui/loading/components/InlineLoading';
import { useRunSelectionUpdate } from '../hooks/use-run-selection-update';
import { pageLabel } from '../models/app-navigation';
import { useNavigationStore } from '../stores/navigation-store';
import { BreadcrumbLabel } from './BreadcrumbLabel';
import { JobCrumb } from './JobCrumb';

export function AppBreadcrumbs() {
  const pages = useNavigationStore((state) => state.pages);
  const view = useNavigationStore((state) => state.preferences.view);
  const goToPage = useNavigationStore((state) => state.goToPage);
  const updateRunSelection = useRunSelectionUpdate();
  const page = pages[pages.length - 1];
  return (
    <nav
      className="min-w-0 flex-1 px-1.5 max-lg:max-w-1/2 max-md:hidden"
      aria-label="Page navigation"
    >
      <ol className={cn('m-0 flex min-w-0 list-none items-center gap-0.5 overflow-hidden p-0')}>
        {pages.map((item, index) => {
          let onNavigate: (() => void) | undefined;
          if (index < pages.length - 1) {
            onNavigate = () => goToPage(index);
          } else if (page.type === 'run' && page.selectedJobId) {
            onNavigate = () => updateRunSelection({ jobId: null });
          }
          const current = index === pages.length - 1;
          let pageCrumb = (
            <BreadcrumbLabel
              label={pageLabel(item, view)}
              current={current}
              onNavigate={onNavigate}
            />
          );
          // A Run opened from a URL has no name until its summary loads; only the current page
          // loads it, so an unnamed ancestor keeps the plain "Run" label.
          if (current && item.type === 'run' && !item.run.name) {
            pageCrumb = <InlineLoading label="Loading run name…" className="mx-1.5 h-4.5 w-20" />;
          }
          return (
            <li
              key={item.key}
              // Earlier crumbs shrink to an ellipsis first so the current page stays readable.
              className={cn('inline-flex min-w-0 items-center gap-0.5 text-xs text-muted', {
                'max-w-full shrink': current,
                'min-w-8 shrink-100 first:min-w-6': !current,
              })}
            >
              {!!index && <ChevronIcon className="size-3 shrink-0 text-muted opacity-55" />}
              {pageCrumb}
              {item.type === 'run' && !!item.selectedJobName && (
                <>
                  <ChevronIcon className="size-3 shrink-0 text-muted opacity-55" />
                  <JobCrumb
                    jobName={item.selectedJobName}
                    stepName={item.selectedStepName}
                    stepSelected={item.selectedStepNumber !== undefined}
                    current={current}
                    onSelectJob={() => updateRunSelection({ jobId: item.selectedJobId ?? null })}
                  />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
