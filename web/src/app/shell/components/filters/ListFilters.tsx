import { ScopeFilters } from '../../../../features/github/components/scope/ScopeFilters';
import { cn } from '../../../../shared/lib/cn';
import { SelectControl } from '../../../../shared/ui/controls/select/components/SelectControl';
import { SearchIcon } from '../../../../shared/ui/icons/actions/SearchIcon';
import { useNavigation } from '../../../navigation/hooks/use-navigation';
import { useRunnerWorkspace } from '../../../runners/hooks/use-runner-workspace';
import { useGitHubSetup } from '../../../setup/hooks/use-github-setup';
import { SelectField } from './SelectField';

export function ListFilters() {
  const { page, preferences, setPreferences, changeScope, runsList } = useNavigation();
  const { rows } = useRunnerWorkspace();
  const { connected } = useGitHubSetup();
  let search = preferences.runnerSearch;
  let status = preferences.runnerStatus;
  let filterLabel = 'Runner filters';
  let searchLabel = 'Search runners';
  let statusLabel = 'Filter runners';
  let statusOptions = [
    { value: 'all', label: 'All runners', muted: true },
    { value: 'active', label: 'Active' },
    { value: 'stopped', label: 'Stopped / Offline' },
    { value: 'attention', label: 'Needs attention' },
  ];
  if (runsList) {
    search = preferences.runSearch;
    status = preferences.runStatus;
    filterLabel = 'Run filters';
    searchLabel = 'Search runs';
    statusLabel = 'Filter runs';
    statusOptions = [
      { value: 'all', label: 'All statuses', muted: true },
      { value: 'active', label: 'Running and queued' },
      { value: 'success', label: 'Success' },
      { value: 'failure', label: 'Failure' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'skipped', label: 'Skipped' },
    ];
  }
  function changeSearch(value: string) {
    setPreferences((previous) => {
      if (runsList) return { ...previous, runSearch: value };
      return { ...previous, runnerSearch: value };
    });
  }
  function changeStatus(value: string) {
    setPreferences((previous) => {
      if (runsList) return { ...previous, runStatus: value };
      return { ...previous, runnerStatus: value };
    });
  }
  return (
    <section
      className={cn(
        'list-toolbar flex min-h-13.5 shrink-0 flex-wrap items-center gap-2 border-b',
        'border-b-line bg-surface px-4 py-2.5 @max-xl/activity-main:grid',
        '@max-xl/activity-main:grid-cols-2',
      )}
      aria-label={filterLabel}
    >
      <label
        className={cn(
          'search-field list-search flex h-8 max-w-60 min-w-32.5 shrink grow basis-40',
          'items-center gap-1.25 rounded-md border border-control-border bg-canvas px-2',
          'text-muted focus-within:outline-3 focus-within:outline-offset-1',
          'focus-within:outline-focus @max-xl/activity-main:col-span-2',
          '@max-xl/activity-main:max-w-none @max-xl/activity-main:basis-full',
        )}
      >
        <SearchIcon className="size-3.5" />
        <input
          className={cn(
            'w-full rounded-xs border-0 bg-transparent px-0 py-1 text-xs text-foreground',
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
      {page.type === 'list' && (
        <ScopeFilters
          scope={preferences.scope}
          runners={rows}
          connected={connected}
          onChange={changeScope}
        />
      )}
      <div className="list-toolbar-state contents">
        <SelectField label="Status">
          <SelectControl
            className="filter-choice min-w-0 flex-1"
            label={statusLabel}
            value={status}
            onChange={changeStatus}
            options={statusOptions}
          />
        </SelectField>
        {!runsList && (
          <SelectField label="Device">
            <SelectControl
              className="filter-choice min-w-0 flex-1"
              label="Filter runner device"
              value={preferences.device}
              onChange={(device) => setPreferences((previous) => ({ ...previous, device }))}
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
    </section>
  );
}
