import type { TargetOption } from '../../../shared/api/types';

export function mergeTargets(items: TargetOption[]) {
  return [...new Map(items.map((item) => [item.name.toLowerCase(), item])).values()];
}
