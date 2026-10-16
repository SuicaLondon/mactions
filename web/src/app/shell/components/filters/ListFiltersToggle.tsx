import { cn } from '../../../../shared/lib/cn';
import { FilterIcon } from '../../../../shared/ui/icons/FilterIcon';
import { useListFiltersStore } from '../../stores/list-filters-store';

/** Phone-only button that shows or hides the filter selects below the search field. */
export function ListFiltersToggle({ panelId, count }: { panelId: string; count: number }) {
  const open = useListFiltersStore((state) => state.open);
  const toggle = useListFiltersStore((state) => state.toggle);
  let label = 'Filters';
  if (count > 0) label = `Filters, ${count} active`;
  return (
    <button
      type="button"
      className={cn(
        'min-h-10 shrink-0 gap-1.5 px-3 text-xs md:hidden',
        'aria-expanded:border-accent aria-expanded:text-foreground',
      )}
      aria-label={label}
      aria-expanded={open}
      aria-controls={panelId}
      onClick={toggle}
    >
      <FilterIcon className="size-4" />
      Filters
      {count > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex min-w-4.5 items-center justify-center rounded-full',
            'bg-accent-fill px-1.25 text-xs/4.5 font-medium text-white',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
