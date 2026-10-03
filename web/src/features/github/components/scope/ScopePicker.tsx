import type { TargetOption } from '../../../../shared/api/types';
import { cn } from '../../../../shared/lib/cn';
import type { Scope } from '../../../actions/data/types/activity-types';
import { useScopeTargets } from '../../hooks/targets/use-scope-targets';
import { TargetSelect } from '../targets/TargetSelect';
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
  return (
    <div
      data-select-anchor
      className={cn(
        'scope-picker flex min-h-8 min-w-35 shrink grow basis-40 flex-wrap items-center',
        'rounded-md border border-control-border bg-canvas pl-2.25',
        'focus-within:border-accent focus-within:ring-2 focus-within:ring-focus',
        '@max-xl/activity-main:max-w-none',
        { 'max-w-75 basis-45': kind === 'repo', 'max-w-62.5': kind === 'org' },
      )}
    >
      <label htmlFor={`scope-${kind}`} className="scope-picker-label shrink-0 text-xs text-muted">
        {shortLabel}
      </label>
      <TargetSelect
        kind={kind}
        compact
        instanceId={`scope-${kind}`}
        label={label}
        options={options}
        value={value}
        onChange={onChange}
        disabled={false}
        loading={query.isFetching}
        clearable
        placeholder={placeholder}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        onLoadMore={onLoadMore}
        footer={!!query.error && <ScopePickerFooter query={query} />}
      />
    </div>
  );
}
