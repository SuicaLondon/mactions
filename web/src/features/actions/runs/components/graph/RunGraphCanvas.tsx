import { useId } from 'react';

import { cn } from '../../../../../shared/lib/cn';
import { type useRunGraphLayout } from '../../hooks/use-run-graph-layout';
import { type RunGraphNode } from '../../models/run-graph';
import { DeclaredNode } from './DeclaredNode';

function nodeLabel(node: RunGraphNode) {
  if (node.name.includes('${{')) return node.id;
  return node.name || node.id;
}

export function RunGraphCanvas({
  nodes,
  members,
  layout,
  expanded,
  toggleExpanded,
  highlightRunnerId,
  onSelect,
}: Pick<
  ReturnType<typeof useRunGraphLayout>,
  'nodes' | 'members' | 'layout' | 'expanded' | 'toggleExpanded'
> & { highlightRunnerId?: number; onSelect: (jobId: number) => void }) {
  const marker = `dependency-arrow-${useId().replaceAll(':', '')}`;
  return (
    <div
      className={cn(
        'run-graph-viewport min-h-60 overflow-auto border-t border-b border-t-line',
        'border-b-line bg-grid-dots px-0 py-2',
      )}
      tabIndex={0}
      aria-label="Scrollable dependency graph"
    >
      <div
        className="run-graph-canvas relative min-w-full"
        style={{ width: layout.width, height: layout.height }}
      >
        <svg
          className="run-graph-edges absolute top-0 left-0 overflow-visible"
          width={layout.width}
          height={layout.height}
          aria-hidden="true"
        >
          <defs>
            <marker
              id={marker}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path className="fill-muted stroke-none" d="M 0 0 L 8 4 L 0 8 z" />
            </marker>
          </defs>
          {layout.edges.map((edge) => (
            <path
              key={`${edge.from}:${edge.to}`}
              className="run-graph-edge fill-none stroke-muted stroke-2"
              d={edge.path}
              markerEnd={`url(#${marker})`}
            />
          ))}
        </svg>
        {layout.positions.map((position) => {
          let label = `${nodeLabel(position.node)}, no dependencies`;
          if (position.node.needs.length) {
            const dependencies = position.node.needs
              .map((id) => {
                const node = nodes.find((node) => node.id === id);
                if (node) return nodeLabel(node);
                return id;
              })
              .join(', ');
            label = `${nodeLabel(position.node)}, depends on ${dependencies}`;
          }
          return (
            <div
              key={position.node.id}
              className="run-graph-position absolute"
              style={{
                left: position.x,
                top: position.y,
                width: position.width,
                height: position.height,
              }}
              role="group"
              aria-label={label}
            >
              <DeclaredNode
                node={position.node}
                jobs={members.get(position.node.id)!}
                expanded={expanded.has(position.node.id)}
                onExpand={() => toggleExpanded(position.node.id)}
                highlightRunnerId={highlightRunnerId}
                onSelect={onSelect}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
