import { SkeletonLine } from '../../SkeletonLine';
import { type LogContent } from './LogContent';

export function LogLoadingLines({
  runner,
}: {
  runner: Parameters<typeof LogContent>[0]['runner'];
}) {
  if (runner) return null;
  return <SkeletonLine className="w-8 shrink-0" />;
}
