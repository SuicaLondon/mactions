import { cn } from '../../../../../shared/lib/cn';
import { ChevronIcon } from '../../../../../shared/ui/icons/navigation/ChevronIcon';
import type { JobSummary } from '../../../data/types/activity-types';
import { type RunGraphNode } from '../../models/run-graph';
import { GraphJob } from './GraphJob';

function nodeLabel(node: RunGraphNode) {
  if (node.name.includes('${{')) return node.id;
  return node.name || node.id;
}

export function DeclaredNode({
  node,
  jobs,
  expanded,
  onExpand,
  highlightRunnerId,
  onSelect,
}: {
  node: RunGraphNode;
  jobs: JobSummary[];
  expanded: boolean;
  onExpand: () => void;
  highlightRunnerId?: number;
  onSelect: (jobId: number) => void;
}) {
  const grouped = node.matrix || node.reusable || jobs.length > 1;
  let displayed = jobs.slice(0, 4);
  let expandLabel = `Show ${jobs.length - 4} more jobs`;
  if (expanded) {
    displayed = jobs;
    expandLabel = 'Show fewer';
  }
  let groupLabel = node.id;
  if (node.matrix) groupLabel = `Matrix · ${jobs.length}`;
  else if (node.reusable) groupLabel = 'Reusable workflow';
  if (!grouped && jobs.length === 1)
    return (
      <GraphJob
        job={jobs[0]}
        label={nodeLabel(node)}
        highlightRunnerId={highlightRunnerId}
        onSelect={onSelect}
      />
    );
  return (
    <div className="run-graph-group overflow-hidden rounded-md border border-line bg-surface">
      <div
        className={cn(
          'run-graph-group-heading flex h-9.25 items-center justify-between gap-2',
          'bg-toolbar px-2.5 py-2',
        )}
      >
        <strong
          className="overflow-hidden text-xs font-medium text-ellipsis whitespace-nowrap"
          title={node.name || node.id}
        >
          {nodeLabel(node)}
        </strong>
        <span className="text-xs whitespace-nowrap text-muted">{groupLabel}</span>
      </div>
      {displayed.map((job) => (
        <GraphJob
          key={job.id}
          job={job}
          presentation="group"
          highlightRunnerId={highlightRunnerId}
          onSelect={onSelect}
        />
      ))}
      {!jobs.length && (
        <p className="run-graph-not-reported m-0 flex h-12.75 items-center p-2.5 text-xs text-muted">
          No matched execution
        </p>
      )}
      {!!(jobs.length > 4) && (
        <button
          className={cn(
            'run-graph-expand flex h-7.5 min-h-0 w-full items-center justify-between',
            'rounded-none border-0 border-t border-t-line bg-surface px-2.5 py-1 text-xs',
            'text-accent shadow-none',
          )}
          aria-expanded={expanded}
          onClick={onExpand}
        >
          {expandLabel}
          <ChevronIcon className={cn('size-2.75 rotate-90', { '-rotate-90': expanded })} />
        </button>
      )}
    </div>
  );
}
