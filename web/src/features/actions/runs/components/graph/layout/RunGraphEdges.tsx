import { useId } from 'react';

import { type RunGraphLayout } from '../../../models/run-graph';

/** The dependency arrows between positioned nodes, drawn beneath them. */
export function RunGraphEdges({ layout }: { layout: RunGraphLayout }) {
  const marker = `dependency-arrow-${useId().replaceAll(':', '')}`;
  return (
    <svg
      className="absolute top-0 left-0 overflow-visible"
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
          className="fill-none stroke-muted stroke-2"
          d={edge.path}
          markerEnd={`url(#${marker})`}
        />
      ))}
    </svg>
  );
}
