import { type TargetOption } from '../../../shared/api/types';
import { cn } from '../../../shared/lib/cn';
import { sentence } from '../../../shared/lib/sentence';
import { SelectControl } from '../../../shared/ui/controls/select/components/SelectControl';
import { type Scope } from '../../actions/data/types/activity-types';
import { useScopeTargets } from '../hooks/use-scope-targets';
import { targetKindCopy, targetSelectOptions } from '../models/target-options';
import { ScopePickerFooter } from './ScopePickerFooter';

export function ScopePicker({
  kind,
  scope,
  local,
  connected,
  onChange,
}: {
  kind: 'org' | 'repo';
  scope: Scope;
  local: TargetOption[];
  connected: boolean;
  onChange: (value: string) => void;
}) {
  const { query, options, setOpen } = useScopeTargets(kind, scope, local, connected);
  let shortLabel = 'Repo';
  let label = 'Filter repository';
  let value = scope.repository;
  let placeholder = 'All repositories';
  if (kind === 'org') {
    shortLabel = 'Org';
    label = 'Filter organization';
    value = scope.organization;
    placeholder = 'Managed scopes';
  }
  let onLoadMore: (() => void) | undefined;
  if (query.hasNextPage) onLoadMore = () => void query.fetchNextPage();
  // Discovery only runs while the menu is open, so keep a first-load failure visible once it closes.
  const loadFailed = !!query.error && !query.data;
  let failureHint: string | undefined;
  if (loadFailed) {
    placeholder = "Couldn't load · open to retry";
    failureHint = `Couldn't load choices. ${sentence(query.error.message)}`;
  }
  return (
    <div
      data-select-anchor
      title={failureHint}
      className={cn(
        'flex min-h-8 min-w-35 shrink grow basis-40 flex-wrap items-center',
        'max-md:min-h-10 pointer-coarse:min-h-10',
        'rounded-md border border-control-border bg-canvas pl-2.25',
        'focus-within:border-accent focus-within:ring-2 focus-within:ring-focus',
        '@max-xl/activity-main:max-w-none',
        { 'max-w-75 basis-45': kind === 'repo', 'max-w-62.5': kind === 'org' },
      )}
    >
      <label
        htmlFor={`scope-${kind}`}
        className={cn('shrink-0 text-xs', {
          'text-muted': !loadFailed,
          'text-danger': loadFailed,
        })}
      >
        {shortLabel}
      </label>
      <SelectControl
        id={`scope-${kind}`}
        label={label}
        className="min-w-0 flex-1 text-xs"
        variant="field"
        searchable
        clearable
        options={targetSelectOptions(options)}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        menu={{
          loading: query.isFetching,
          onOpen: () => setOpen(true),
          onClose: () => setOpen(false),
          onLoadMore,
          loadMoreLabel: targetKindCopy(kind).loadMoreLabel,
          footer: !!query.error && (
            <ScopePickerFooter
              error={query.error}
              nextPageFailed={query.isFetchNextPageError}
              retrying={query.isFetching}
              onRetry={() => {
                if (query.isFetchNextPageError) void query.fetchNextPage();
                else void query.refetch();
              }}
            />
          ),
        }}
      />
    </div>
  );
}
