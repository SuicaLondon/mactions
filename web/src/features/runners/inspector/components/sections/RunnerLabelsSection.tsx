import type { Action, Runner } from '../../../../../shared/api/types';
import { linkButtonClassName } from '../../../../../shared/ui/controls/buttons/link-button-class';
import { isUnregistered, runnerLabels } from '../../../shared/models/runner-model';
import { RunnerLabels } from './RunnerLabels';

interface RunnerLabelsSectionProps {
  runner: Runner;
  locked: boolean;
  connected: boolean;
  onAction: (action: Action) => void;
}

export function RunnerLabelsSection({
  runner,
  locked,
  connected,
  onAction,
}: RunnerLabelsSectionProps) {
  let editLabelsTitle: string | undefined;
  if (!connected) editLabelsTitle = 'Connect GitHub to edit labels';
  return (
    <section className="mx-0 mb-3 border-t border-t-line px-4.5 py-3.75">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h4 className="m-0 text-xs font-semibold">Labels</h4>
        <button
          className={linkButtonClassName}
          disabled={locked || isUnregistered(runner) || !connected}
          title={editLabelsTitle}
          onClick={() => onAction('labels')}
        >
          Edit…
        </button>
      </div>
      <div className="flex flex-wrap gap-1.25">
        <RunnerLabels labels={runnerLabels(runner)} />
      </div>
    </section>
  );
}
