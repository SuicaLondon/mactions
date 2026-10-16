/** Opens or closes `id` in a list of expanded ids, keeping each id once. */
export function toggleExpandedId(ids: readonly number[], id: number, open: boolean): number[] {
  if (open) return [...new Set([...ids, id])];
  return ids.filter((value) => value !== id);
}

/** Opens `id`, returning the same list when it is already open so state stays unchanged. */
export function withExpandedId(ids: number[], id: number): number[] {
  if (ids.includes(id)) return ids;
  return [...ids, id];
}
