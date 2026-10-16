import { type ReactNode } from 'react';

import { cn } from '../../../../../../shared/lib/cn';
import {
  graphDependencyLabels,
  graphLevels,
  graphPositionLabel,
  type RunGraphLayout,
  type RunGraphNode,
} from '../../../models/run-graph';

/**
 * The phone pipeline: dependency levels stacked top to bottom, each declared node as a
 * full-width card with its dependencies named above it instead of drawn as edges.
 */
export function RunGraphLevels({
  nodes,
  layout,
  renderNode,
}: {
  nodes: RunGraphNode[];
  layout: RunGraphLayout;
  /** Draws a declared node as a full-width card. */
  renderNode: (node: RunGraphNode) => ReactNode;
}) {
  return (
    <ol
      className={cn('m-0 flex flex-col gap-4 border-y border-line', 'bg-canvas p-3')}
      aria-label="Dependency levels"
    >
      {graphLevels(layout).map((level, index) => (
        <li key={level[0].layer} className="flex flex-col gap-2">
          <h4 className="m-0 text-xs font-medium text-muted">Level {index + 1}</h4>
          {level.map((position) => (
            <div
              key={position.node.id}
              className="flex flex-col gap-1"
              role="group"
              aria-label={graphPositionLabel(position.node, nodes)}
            >
              {!!position.node.needs.length && (
                <p className="m-0 truncate text-xs text-muted">
                  needs: {graphDependencyLabels(position.node, nodes).join(', ')}
                </p>
              )}
              {renderNode(position.node)}
            </div>
          ))}
        </li>
      ))}
    </ol>
  );
}
