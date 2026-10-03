import { cn } from '../../../../shared/lib/cn';
import { ChevronIcon } from '../../../../shared/ui/icons/navigation/ChevronIcon';
import { useNavigation } from '../../hooks/use-navigation';
import { JobBreadcrumbLabel } from './JobBreadcrumbLabel';
import { PageBreadcrumbLabel } from './PageBreadcrumbLabel';

export function AppBreadcrumbs() {
  const { pages, goToPage, page, updateRunSelection, pageLabel } = useNavigation();
  return (
    <nav
      className="page-ancestry min-w-0 flex-1 px-1.5 max-lg:max-w-1/2 max-sm:max-w-none"
      aria-label="Page navigation"
    >
      <ol
        className={cn(
          'm-0 flex min-w-0 list-none items-center gap-0.5 overflow-x-auto p-0',
          'scrollbar-none',
        )}
      >
        {pages.map((item, index) => {
          let onNavigate: (() => void) | undefined;
          if (index < pages.length - 1) {
            onNavigate = () => goToPage(index);
          } else if (page.type === 'run' && page.selectedJobId) {
            onNavigate = () => updateRunSelection({ jobId: null });
          }
          const current = index === pages.length - 1;
          return (
            <li
              key={item.key}
              className="inline-flex min-w-0 shrink-0 items-center gap-0.5 text-xs text-muted"
            >
              {!!index && <ChevronIcon className="size-3 text-muted opacity-55" />}
              <PageBreadcrumbLabel onNavigate={onNavigate} label={pageLabel(item)} />
              {!!(item.type === 'run' && item.selectedJobName) && (
                <>
                  <ChevronIcon className="size-3 text-muted opacity-55" />
                  <JobBreadcrumbLabel
                    item={item}
                    current={current}
                    onSelectJob={() => updateRunSelection({ jobId: item.selectedJobId ?? null })}
                  />
                  {!!(current && item.selectedStepName) && (
                    <>
                      <ChevronIcon className="size-3 text-muted opacity-55" />
                      <span
                        aria-current="page"
                        className={cn(
                          'max-w-52.5 overflow-hidden py-1 font-medium text-ellipsis text-foreground',
                          'whitespace-nowrap',
                        )}
                      >
                        {item.selectedStepName}
                      </span>
                    </>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
