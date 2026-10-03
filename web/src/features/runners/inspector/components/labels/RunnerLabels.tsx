import type { Runner } from '../../../../../shared/api/types';
import { cn } from '../../../../../shared/lib/cn';
import { runnerLabels } from '../../../shared/models/runner-model';
import { RunnerLabelValue } from './RunnerLabelValue';

export function RunnerLabels({ r }: { r: Runner }) {
  if (runnerLabels(r).length)
    return runnerLabels(r).map((l) => {
      let title = 'GitHub default · read-only';
      if (l.type === 'custom') title = 'Custom label';
      return (
        <span
          key={l.name}
          className={cn(
            'label inline-flex max-w-full items-center gap-1 rounded-md border border-line',
            'bg-surface px-1.5 py-0.75 text-xs wrap-anywhere',
          )}
          title={title}
        >
          <RunnerLabelValue l={l} />
          {l.name}
        </span>
      );
    });
  return (
    <span className="detail-help mx-0 mt-2 mb-0 text-xs leading-normal text-muted">
      No custom labels
    </span>
  );
}
