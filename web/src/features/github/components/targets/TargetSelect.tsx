import type { ReactNode } from 'react';

import type { TargetOption } from '../../../../shared/api/types';
import { cn } from '../../../../shared/lib/cn';
import { SelectControl } from '../../../../shared/ui/controls/select/components/SelectControl';
export function TargetSelect({
  kind,
  options,
  value,
  onChange,
  disabled,
  loading,
  instanceId = 'runner-target',
  label,
  placeholder,
  clearable = false,
  compact = false,
  onOpen,
  onClose,
  footer,
  onLoadMore,
}: {
  kind: 'repo' | 'org';
  options: TargetOption[];
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  loading: boolean;
  instanceId?: string;
  label?: string;
  placeholder?: string;
  clearable?: boolean;
  compact?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  footer?: ReactNode;
  onLoadMore?: () => void;
}) {
  const items = options.map((option) => {
    let detail = 'Public';
    if (option.kind === 'org') detail = 'Organization';
    else if (option.private) detail = 'Private';
    return { value: option.name, label: option.name, detail };
  });
  let defaultLabel = 'Organization';
  let defaultPlaceholder = 'Search or choose an organization…';
  let loadMoreLabel = 'Load more organizations';
  if (kind === 'repo') {
    defaultLabel = 'Repository';
    defaultPlaceholder = 'Search or choose a repository…';
    loadMoreLabel = 'Load more repositories';
  }
  return (
    <SelectControl
      id={instanceId}
      label={label ?? defaultLabel}
      className={cn('repo-select min-w-0 text-xs', { 'flex-1': compact })}
      compact={compact}
      embedded={compact}
      searchable
      clearable={clearable}
      options={items}
      value={value}
      onChange={onChange}
      disabled={disabled}
      loading={loading}
      onOpen={onOpen}
      onClose={onClose}
      footer={footer}
      onLoadMore={onLoadMore}
      loadMoreLabel={loadMoreLabel}
      placeholder={placeholder ?? defaultPlaceholder}
    />
  );
}
