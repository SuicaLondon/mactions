import { memo, type ReactNode } from 'react';

import { cn } from '../../../../../shared/lib/cn';
import { compactTouchHitAreaClassName } from '../../../../../shared/ui/controls/buttons/link-button-class';
import { UpdateFailedIndicator } from '../../../../../shared/ui/feedback/components/UpdateFailedIndicator';
import { ExternalLinkIcon } from '../../../../../shared/ui/icons/ExternalLinkIcon';
import type { JobSummary } from '../../../data/types/activity-types';
import { usePhoneViewport } from '../../../shared/hooks/use-phone-viewport';
import { ranOnRunner } from '../../../shared/models/job-runner';
import type { RefreshState } from '../../../shared/types/refresh-state';
import { useRunGraphExpansion } from '../../hooks/use-run-graph-expansion';
import { useRunGraphLayout } from '../../hooks/use-run-graph-layout';
import { type RunGraphData, type RunGraphNode } from '../../models/run-graph';
import { DeclaredNode } from './DeclaredNode';
import { GraphJob } from './GraphJob';
import { RunGraphCanvas } from './layout/RunGraphCanvas';
import { RunGraphLevels } from './layout/RunGraphLevels';

export const RunGraph = memo(function RunGraph({
  graph,
  jobs,
  highlightRunnerId,
  refresh,
  onSelect,
}: {
  graph: RunGraphData;
  jobs: JobSummary[];
  highlightRunnerId?: number;
  /**
   * The graph's background refresh, reported in the header row while `graph` still shows earlier
   * data; a graph without one has no refresh status. Must be stable so the memoized graph does
   * not rerender on every poll.
   */
  refresh?: RefreshState;
  onSelect: (jobId: number) => void;
}) {
  const { expanded, toggleExpanded } = useRunGraphExpansion();
  const { nodes, members, layout, unmapped } = useRunGraphLayout(graph, jobs, expanded);
  // Phones stack dependency levels vertically instead of panning a wide canvas.
  const phone = usePhoneViewport();
  let notice = 'Some job mappings are unavailable.';
  let emptyMessage = 'No jobs are declared in this workflow.';
  let unmappedTitle = 'Unmapped jobs';
  let unmappedMessage =
    'These jobs could not be matched to the workflow definition. Their dependencies are unknown.';
  if (graph.state === 'unavailable') {
    notice = 'Workflow dependencies are unavailable.';
    emptyMessage = notice;
    unmappedTitle = 'Jobs';
    unmappedMessage = 'Dependency information is unavailable for these jobs.';
  }
  // The canvas, the phone levels, and the unresolved list each place a declared node their way.
  function renderNode(node: RunGraphNode) {
    return (
      <DeclaredNode
        key={node.id}
        node={node}
        jobs={members.get(node.id)!}
        expanded={expanded.has(node.id)}
        highlightRunnerId={highlightRunnerId}
        onExpand={() => toggleExpanded(node.id)}
        onSelect={onSelect}
      />
    );
  }
  // Without a pipeline, the unmapped jobs below stand in for the empty message.
  let pipeline: ReactNode = null;
  if (layout.positions.length) {
    pipeline = (
      <RunGraphCanvas nodes={nodes} members={members} layout={layout} renderNode={renderNode} />
    );
    if (phone) pipeline = <RunGraphLevels nodes={nodes} layout={layout} renderNode={renderNode} />;
  } else if (!unmapped.length) {
    pipeline = (
      <p
        className={cn(
          'm-0 mx-0 mb-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5',
          'px-5 pt-0 pb-3 text-xs/normal text-muted max-md:px-3 max-md:pb-2.5',
        )}
      >
        {emptyMessage}
      </p>
    );
  }
  return (
    <section className="min-w-0" aria-label="Job dependency pipeline">
      <header
        className={cn(
          'flex items-center justify-between gap-4 px-5 py-3.75',
          'max-md:gap-2 max-md:p-3',
        )}
      >
        <div className="flex items-baseline gap-2.5 max-md:min-w-0 max-md:gap-1.5">
          <h3 className="m-0 text-sm font-semibold">Pipeline</h3>
          {/* Phones drop the subtitle; the pipeline below explains itself. */}
          <span className="text-xs text-muted max-md:hidden">Job dependencies</span>
        </div>
        <div className="flex min-w-0 items-center gap-3 max-md:shrink-0 max-md:gap-2">
          {!!refresh && (
            <UpdateFailedIndicator
              error={refresh.error}
              retrying={refresh.refreshing}
              onRetry={refresh.onRefresh}
            />
          )}
          {!!graph.source && (
            <a
              className={cn(
                'inline-flex items-center gap-1.25 text-xs text-muted no-underline',
                'hover:text-accent',
                compactTouchHitAreaClassName,
              )}
              href={graph.source.url}
              target="_blank"
              rel="noreferrer"
              aria-label="Workflow source"
              title={`Workflow source: ${graph.source.path} @ ${graph.source.sha}`}
            >
              <span className="max-md:hidden">Workflow source</span>
              <span className="md:hidden">Source</span>
              <ExternalLinkIcon className="size-3.25" />
            </a>
          )}
        </div>
      </header>
      {!!(graph.state !== 'complete') && (
        <div
          className={cn(
            'm-0 mx-0 mb-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5',
            'px-5 pt-0 pb-3 text-xs/normal text-muted max-md:px-3 max-md:pb-2.5',
          )}
        >
          <span>{notice}</span>
          {!!graph.message && (
            <details className="text-xs">
              <summary className="cursor-pointer">Details</summary>
              <p className="mt-1.5 max-w-175 wrap-anywhere">{graph.message}</p>
            </details>
          )}
        </div>
      )}
      {pipeline}
      {!!layout.unresolved.length && (
        <div className="mx-0 mb-3 px-5 py-4 max-md:p-3">
          <h4 className="m-0 text-xs font-medium">Unresolved dependencies</h4>
          <p className="mt-1.25 text-xs text-muted">
            These workflow jobs reference missing or cyclic dependencies.
          </p>
          <div className="grid grid-cols-cards gap-2.5 max-md:grid-cols-1">
            {layout.unresolved.map((node) => renderNode(node))}
          </div>
        </div>
      )}
      {!!unmapped.length && (
        <div className="mx-0 mb-3 px-5 py-4 max-md:p-3">
          <h4 className="m-0 text-xs font-medium">
            {unmappedTitle} <span className="ml-1 text-xs text-muted">{unmapped.length}</span>
          </h4>
          <p className="mt-1.25 text-xs text-muted">{unmappedMessage}</p>
          <div className="grid grid-cols-cards gap-2.5 max-md:grid-cols-1">
            {unmapped.map((job) => (
              <GraphJob
                key={job.id}
                job={job}
                presentation="unmapped"
                ranOnSelectedRunner={ranOnRunner(job, highlightRunnerId)}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
});
