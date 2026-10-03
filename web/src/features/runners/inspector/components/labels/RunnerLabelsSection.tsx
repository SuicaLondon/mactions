import type { Action, Runner } from '../../../../../shared/api/types';
import { RunnerLabels } from './RunnerLabels';

interface RunnerLabelsSectionProps {
  runner: Runner;
  locked: boolean;
  connected: boolean;
  onAction: (runner: Runner, action: Action) => void;
}
export function RunnerLabelsSection({
  runner: r,
  locked,
  connected,
  onAction,
}: RunnerLabelsSectionProps) {
  const unregistered = !r.github_id || r.deregistered;
  let editLabelsTitle: string | undefined;
  if (!connected) editLabelsTitle = 'Connect GitHub to edit labels';
  return (
    <section className="detail-section mx-0 mb-3 border-t border-t-line px-4.5 py-3.75">
      <div className="section-title mb-2.5 flex items-baseline justify-between">
        <h4 className="m-0 mt-0 text-xs font-semibold">Labels</h4>
        <button
          className="min-h-5.5 border-0 bg-transparent p-0 text-xs text-accent shadow-none"
          disabled={locked || unregistered || !connected}
          title={editLabelsTitle}
          onClick={() => onAction(r, 'labels')}
        >
          Edit…
        </button>
      </div>
      <div className="labels flex flex-wrap gap-1.25">
        <RunnerLabels r={r} />
      </div>
    </section>
  );
}
