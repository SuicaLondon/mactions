import { memo } from 'react';

import { cn } from '../../../../../shared/lib/cn';
import { ExternalLinkIcon } from '../../../../../shared/ui/icons/navigation/ExternalLinkIcon';
import type { JobSummary } from '../../../data/types/activity-types';
import { useRunGraphLayout } from '../../hooks/use-run-graph-layout';
import { type RunGraphData } from '../../models/run-graph';
import { DeclaredNode } from './DeclaredNode';
import { GraphJob } from './GraphJob';
import { RunGraphCanvas } from './RunGraphCanvas';

export const RunGraph = memo(function RunGraph({
  graph,
  jobs,
  highlightRunnerId,
  onSelect,
}: {
  graph: RunGraphData;
  jobs: JobSummary[];
  highlightRunnerId?: number;
  onSelect: (jobId: number) => void;
}) {
  const { nodes, members, layout, unmapped, expanded, toggleExpanded } = useRunGraphLayout(
    graph,
    jobs,
  );
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
  return (
    <section className="run-graph min-w-0" aria-label="Job dependency pipeline">
      <header
        className={cn(
          'run-graph-heading flex items-center justify-between gap-4 px-5 py-3.75',
          'max-md:p-3',
        )}
      >
        <div className="flex items-baseline gap-2.5 max-md:flex-col max-md:gap-0.75">
          <h3 className="m-0 text-sm font-semibold">Pipeline</h3>
          <span className="text-xs text-muted">Job dependencies</span>
        </div>
        {!!graph.source && (
          <a
            className={cn(
              'inline-flex items-center gap-1.25 text-xs text-muted no-underline',
              'hover:text-accent',
            )}
            href={graph.source.url}
            target="_blank"
            rel="noreferrer"
            title={`${graph.source.path} @ ${graph.source.sha}`}
          >
            Workflow source
            <ExternalLinkIcon className="size-3.25" />
          </a>
        )}
      </header>
      {!!(graph.state !== 'complete') && (
        <div
          className={cn(
            'run-graph-notice m-0 mx-0 mb-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5',
            'px-5 pt-0 pb-3 text-xs leading-normal text-muted max-md:px-3 max-md:pb-2.5',
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
      {!!layout.positions.length && (
        <RunGraphCanvas
          nodes={nodes}
          members={members}
          layout={layout}
          expanded={expanded}
          toggleExpanded={toggleExpanded}
          highlightRunnerId={highlightRunnerId}
          onSelect={onSelect}
        />
      )}
      {!!(!layout.positions.length && !unmapped.length) && (
        <p
          className={cn(
            'run-graph-notice m-0 mx-0 mb-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5',
            'px-5 pt-0 pb-3 text-xs leading-normal text-muted max-md:px-3 max-md:pb-2.5',
          )}
        >
          {emptyMessage}
        </p>
      )}
      {!!layout.unresolved.length && (
        <div className="run-graph-unmapped mx-0 mb-3 px-5 py-4 max-md:p-3">
          <h4 className="m-0 text-xs font-medium">Unresolved dependencies</h4>
          <p className="mt-1.25 text-xs text-muted">
            These workflow jobs reference missing or cyclic dependencies.
          </p>
          <div
            className={cn(
              'run-graph-unmapped-jobs grid',
              'grid-cols-[repeat(auto-fill,_minmax(--spacing(52.5),_1fr))] gap-2.5',
              'max-md:grid-cols-1',
            )}
          >
            {layout.unresolved.map((node) => (
              <DeclaredNode
                key={node.id}
                node={node}
                jobs={members.get(node.id)!}
                expanded={expanded.has(node.id)}
                onExpand={() => toggleExpanded(node.id)}
                highlightRunnerId={highlightRunnerId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}
      {!!unmapped.length && (
        <div className="run-graph-unmapped mx-0 mb-3 px-5 py-4 max-md:p-3">
          <h4 className="m-0 text-xs font-medium">
            {unmappedTitle} <span className="ml-1 text-xs text-muted">{unmapped.length}</span>
          </h4>
          <p className="mt-1.25 text-xs text-muted">{unmappedMessage}</p>
          <div
            className={cn(
              'run-graph-unmapped-jobs grid',
              'grid-cols-[repeat(auto-fill,_minmax(--spacing(52.5),_1fr))] gap-2.5',
              'max-md:grid-cols-1',
            )}
          >
            {unmapped.map((job) => (
              <GraphJob
                key={job.id}
                job={job}
                presentation="unmapped"
                highlightRunnerId={highlightRunnerId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
});
