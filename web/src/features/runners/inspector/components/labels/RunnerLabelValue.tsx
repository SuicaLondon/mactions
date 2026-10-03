import type { RunnerLabel } from '../../../../../shared/api/types';
import { LockIcon } from '../../../../../shared/ui/icons/status/LockIcon';

export function RunnerLabelValue({ l }: { l: RunnerLabel }) {
  if (l.type === 'custom') return null;
  return <LockIcon className="size-2.5 text-muted" />;
}
