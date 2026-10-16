import { type ReactNode, useRef } from 'react';

import { cn } from '../../../../../../shared/lib/cn';
import { useFirstFailureScroll } from '../../../hooks/use-first-failure-scroll';
import {
  graphPositionLabel,
  graphScrollTargets,
  type RunGraphLayout,
  type RunGraphMembers,
  type RunGraphNode,
} from '../../../models/run-graph';
import { RunGraphEdges } from './RunGraphEdges';

export function RunGraphCanvas({
  nodes,
  members,
  layout,
  renderNode,
}: {
  nodes: RunGraphNode[];
  /** Matched executions, which locate the first failed node to reveal on load. */
  members: RunGraphMembers;
  layout: RunGraphLayout;
  /** Draws a declared node inside its positioned box. */
  renderNode: (node: RunGraphNode) => ReactNode;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const targets = graphScrollTargets(layout, members);
  useFirstFailureScroll(viewport, targets.failure, targets.root);
  return (
    <div
      ref={viewport}
      className={cn(
        'min-h-60 overflow-auto border-y border-t-line',
        'border-b-line graph-grid px-0 py-2',
      )}
      tabIndex={0}
      aria-label="Scrollable dependency graph"
    >
      <div className="relative min-w-full" style={{ width: layout.width, height: layout.height }}>
        <RunGraphEdges layout={layout} />
        {layout.positions.map((position) => (
          <div
            key={position.node.id}
            className="absolute"
            style={{
              left: position.x,
              top: position.y,
              width: position.width,
              height: position.height,
            }}
            role="group"
            aria-label={graphPositionLabel(position.node, nodes)}
          >
            {renderNode(position.node)}
          </div>
        ))}
      </div>
    </div>
  );
}
