import { useId } from 'react';

import { ScopeFilters } from '../../../../features/github/components/ScopeFilters';
import { useLocalRunners } from '../../../../features/runners/data/hooks/use-local-runners';
import { useRunnersLoading } from '../../../../features/runners/data/hooks/use-runners-loading';
import { cn } from '../../../../shared/lib/cn';
import { SelectControl } from '../../../../shared/ui/controls/select/components/SelectControl';
import { SearchIcon } from '../../../../shared/ui/icons/SearchIcon';
import { useCurrentPage } from '../../../navigation/hooks/use-current-page';
import { isRunsList } from '../../../navigation/models/app-navigation';
import { useNavigationStore } from '../../../navigation/stores/navigation-store';
import { useGitHubConnected } from '../../../setup/hooks/use-github-connected';
import { activeFilterCount, listFilterCopy } from '../../models/list-filters';
import { useListFiltersStore } from '../../stores/list-filters-store';
import { ListFiltersSkeleton } from './ListFiltersSkeleton';
import { ListFiltersToggle } from './ListFiltersToggle';
import { SelectField } from './SelectField';

export function ListFilters() {
  const page = useCurrentPage();
  const preferences = useNavigationStore((state) => state.preferences);
  const updatePreferences = useNavigationStore((state) => state.updatePreferences);
  const changeScope = useNavigationStore((state) => state.changeScope);
  const rows = useLocalRunners();
  const starting = useRunnersLoading();
  const connected = useGitHubConnected();
  const runsList = isRunsList(page, preferences.view);
  const filtersOpen = useListFiltersStore((state) => state.open);
  const panelId = useId();
  const showScope = page.type === 'list';
  if (starting) return <ListFiltersSkeleton runsList={runsList} showScope={showScope} />;
  const { filterLabel, searchLabel, statusLabel, statusOptions } = listFilterCopy(runsList);
  let search = preferences.runnerSearch;
  let status = preferences.runnerStatus;
  if (runsList) {
    search = preferences.runSearch;
    status = preferences.runStatus;
  }
  function changeSearch(value: string) {
    if (runsList) updatePreferences({ runSearch: value });
    else updatePreferences({ runnerSearch: value });
  }
  function changeStatus(value: string) {
    if (runsList) updatePreferences({ runStatus: value });
    else updatePreferences({ runnerStatus: value });
  }
  return (
    <section
      className={cn(
        'flex min-h-13.5 shrink-0 flex-wrap items-center gap-2 border-b',
        'border-b-line bg-surface px-4 py-2.5 max-md:px-3 @max-xl/activity-main:grid',
        '@max-xl/activity-main:grid-cols-2',
      )}
      aria-label={filterLabel}
    >
      {/* Phones keep the search field and Filters toggle on one row. */}
      <div className="contents max-md:col-span-2 max-md:flex max-md:gap-2">
        <label
          className={cn(
            'flex h-8 max-w-60 min-w-32.5 shrink grow basis-32',
            // On touch the input itself is the 40px target, so the bordered field grows around it.
            'max-md:h-auto pointer-coarse:h-auto',
            'items-center gap-1.25 rounded-md border border-control-border bg-canvas px-2',
            'text-muted focus-within:outline-3 focus-within:outline-offset-1',
            'focus-within:outline-focus @max-xl/activity-main:col-span-2',
            '@max-xl/activity-main:max-w-none @max-xl/activity-main:basis-full',
            'max-md:min-w-0 max-md:basis-auto',
          )}
        >
          <SearchIcon className="size-3.5" />
          <input
            className={cn(
              'w-full rounded-xs border-0 bg-transparent px-0 py-1 text-xs text-foreground',
              'max-md:min-h-10 pointer-coarse:min-h-10',
              'outline-none focus-visible:outline-none',
            )}
            type="search"
            placeholder={searchLabel}
            aria-label={searchLabel}
            autoComplete="off"
            spellCheck={false}
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
          />
        </label>
        <ListFiltersToggle
          panelId={panelId}
          count={activeFilterCount(preferences, { runsList, showScope })}
        />
      </div>
      {/* Desktop lays the selects out inline; phones collapse them behind the toggle. */}
      <div id={panelId} className={cn('contents', { 'max-md:hidden': !filtersOpen })}>
        {showScope && (
          <ScopeFilters
            scope={preferences.scope}
            runners={rows}
            connected={connected}
            onChange={changeScope}
          />
        )}
        <div className="contents">
          {/* Fixed inline widths, so choosing a longer value never moves the next filter. */}
          <SelectField label="Status" className="@xl/activity-main:w-52">
            <SelectControl
              className="min-w-0 flex-1"
              variant="field"
              label={statusLabel}
              value={status}
              onChange={changeStatus}
              options={statusOptions}
            />
          </SelectField>
          {!runsList && (
            <SelectField label="Device" className="@xl/activity-main:w-48">
              <SelectControl
                className="min-w-0 flex-1"
                variant="field"
                label="Runner device"
                value={preferences.device}
                onChange={(device) => updatePreferences({ device })}
                options={[
                  { value: 'all', label: 'All devices', muted: true },
                  { value: 'this_device', label: 'This device' },
                  { value: 'other_device', label: 'Other devices' },
                  { value: 'unknown', label: 'Device unknown' },
                ]}
              />
            </SelectField>
          )}
        </div>
      </div>
    </section>
  );
}
