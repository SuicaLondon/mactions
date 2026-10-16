import type { SelectOption } from '../types';

/** The menu's options, followed by the Load more row when more can be loaded. */
export function selectItems(
  options: SelectOption[],
  loadMore: SelectOption | undefined,
): SelectOption[] {
  if (!loadMore) return options;
  return [...options, loadMore];
}

/** The option for the value; a value outside the loaded options still shows as itself. */
export function selectedOption(options: SelectOption[], value: string): SelectOption | null {
  const selected = options.find((option) => option.value === value);
  if (selected) return selected;
  if (value) return { value, label: value };
  return null;
}
