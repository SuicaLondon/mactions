import type { TargetOption } from '../../../shared/api/types';
import type { SelectOption } from '../../../shared/ui/controls/select/types';

export function mergeTargets(items: TargetOption[]) {
  return [...new Map(items.map((item) => [item.name.toLowerCase(), item])).values()];
}

/** Select choices for GitHub targets, labelled by visibility. */
export function targetSelectOptions(options: TargetOption[]): SelectOption[] {
  return options.map((option) => {
    let detail = 'Public';
    if (option.kind === 'org') detail = 'Organization';
    else if (option.private) detail = 'Private';
    return { value: option.name, label: option.name, detail };
  });
}

export function targetKindCopy(kind: 'repo' | 'org') {
  if (kind === 'repo')
    return {
      label: 'Repository',
      placeholder: 'Search or choose a repository…',
      loadMoreLabel: 'Load more repositories',
      singular: 'repository',
      plural: 'repositories',
    };
  return {
    label: 'Organization',
    placeholder: 'Search or choose an organization…',
    loadMoreLabel: 'Load more organizations',
    singular: 'organization',
    plural: 'organizations',
  };
}

/** A complete target count, such as "1 organization" or "9 repositories". */
export function targetCount(kind: 'repo' | 'org', count: number) {
  const copy = targetKindCopy(kind);
  if (count === 1) return `1 ${copy.singular}`;
  return `${count} ${copy.plural}`;
}
