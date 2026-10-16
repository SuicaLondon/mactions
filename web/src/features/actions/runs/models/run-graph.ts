import type { JobSummary } from '../../data/types/activity-types';
import { isFailed } from '../../shared/models/activity-status';

export interface RunGraphNode {
  id: string;
  name: string;
  needs: string[];
  job_ids: number[];
  matrix: boolean;
  reusable: boolean;
}

export interface RunGraphData {
  state: 'complete' | 'partial' | 'unavailable';
  message: string;
  nodes: RunGraphNode[];
  unmapped_job_ids: number[];
  source: {
    repository: string;
    path: string;
    sha: string;
    run_attempt: number;
    url: string;
  } | null;
}

export interface GraphPosition {
  node: RunGraphNode;
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  /** The explicit route of a skip-level edge; adjacent layers use a plain curve. */
  route: RoutePoint[] | undefined;
  path: string;
}

/** Positioned nodes and edges for the dependency graph. */
export interface RunGraphLayout {
  positions: GraphPosition[];
  edges: GraphEdge[];
  width: number;
  height: number;
  /** Declared nodes whose dependencies are missing or cyclic. */
  unresolved: RunGraphNode[];
}

/** Matched executions for each declared node, keyed by node id. */
export type RunGraphMembers = Map<string, JobSummary[]>;

/** A run's graph with its executions matched to declared nodes and laid out. */
export interface RunGraphGeometry {
  nodes: RunGraphNode[];
  members: RunGraphMembers;
  layout: RunGraphLayout;
  /** Executions no declared node accounts for. */
  unmapped: JobSummary[];
}

/** A node's display name; unevaluated expressions fall back to the job id. */
export function graphNodeLabel(node: RunGraphNode) {
  if (node.name.includes('${{')) return node.id;
  return node.name || node.id;
}

/** The display names of the nodes a node depends on; unknown ids name themselves. */
export function graphDependencyLabels(node: RunGraphNode, nodes: RunGraphNode[]) {
  return node.needs.map((id) => {
    const dependency = nodes.find((candidate) => candidate.id === id);
    if (dependency) return graphNodeLabel(dependency);
    return id;
  });
}

/** The accessible label of a positioned node, naming the nodes it depends on. */
export function graphPositionLabel(node: RunGraphNode, nodes: RunGraphNode[]) {
  if (!node.needs.length) return `${graphNodeLabel(node)}, no dependencies`;
  return `${graphNodeLabel(node)}, depends on ${graphDependencyLabels(node, nodes).join(', ')}`;
}

/** Positioned nodes grouped by dependency level, top to bottom within each level. */
export function graphLevels(layout: RunGraphLayout) {
  const levels = new Map<number, GraphPosition[]>();
  for (const position of layout.positions)
    levels.set(position.layer, [...(levels.get(position.layer) ?? []), position]);
  return [...levels.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, positions]) => [...positions].sort((left, right) => left.y - right.y));
}

/** Where the viewport scrolls on load: the first failed node, else the root column. */
export function graphScrollTargets(layout: RunGraphLayout, members: RunGraphMembers) {
  return {
    failure: layout.positions.find((position) => members.get(position.node.id)?.some(isFailed)),
    root: layout.positions.find((position) => position.layer === 0),
  };
}

export function prepareRunGraphLayout(
  graph: RunGraphData,
  jobs: JobSummary[],
  expanded: ReadonlySet<string>,
): RunGraphGeometry {
  const nodes = graph.nodes ?? [];
  const byJobId = new Map(jobs.map((job) => [job.id, job]));
  const members = new Map(
    nodes.map((node) => [
      node.id,
      node.job_ids.map((id) => byJobId.get(id)).filter((job): job is JobSummary => Boolean(job)),
    ]),
  );
  const heights = Object.fromEntries(
    nodes.map((node) => {
      const count = members.get(node.id)?.length ?? 0;
      const grouped = node.matrix || node.reusable || count !== 1;
      let height = 76;
      if (grouped) {
        let displayedCount = Math.min(4, count);
        if (expanded.has(node.id)) displayedCount = count;
        height = 38 + Math.max(1, displayedCount) * 52;
        if (count > 4) height += 30;
      }
      return [node.id, height];
    }),
  );
  const layout = layoutRunGraph(nodes, heights);
  const mapped = new Set(nodes.flatMap((node) => node.job_ids));
  const explicitlyUnmapped = new Set(graph.unmapped_job_ids);
  const unmapped = jobs.filter((job) => explicitlyUnmapped.has(job.id) || !mapped.has(job.id));
  return { nodes, members, layout, unmapped };
}

export interface RoutePoint {
  x: number;
  y: number;
}

function roundedRoute(points: RoutePoint[]) {
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length - 1; index++) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const incoming = Math.hypot(current.x - previous.x, current.y - previous.y);
    const outgoing = Math.hypot(next.x - current.x, next.y - current.y);
    const radius = Math.min(6, incoming / 2, outgoing / 2);
    const before = {
      x: current.x + ((previous.x - current.x) * radius) / incoming,
      y: current.y + ((previous.y - current.y) * radius) / incoming,
    };
    const after = {
      x: current.x + ((next.x - current.x) * radius) / outgoing,
      y: current.y + ((next.y - current.y) * radius) / outgoing,
    };
    path += ` L ${before.x} ${before.y} Q ${current.x} ${current.y} ${after.x} ${after.y}`;
  }
  const last = points[points.length - 1];
  return `${path} L ${last.x} ${last.y}`;
}

/** Position only source-declared dependencies; runtime order never determines edges. */
export function layoutRunGraph(
  nodes: RunGraphNode[],
  heights: Record<string, number> = {},
): RunGraphLayout {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const pending = new Map(nodes.map((node) => [node.id, new Set(node.needs).size]));
  const children = new Map<string, string[]>();
  for (const node of nodes)
    for (const need of new Set(node.needs))
      children.set(need, [...(children.get(need) ?? []), node.id]);
  const ready = nodes.filter((node) => !node.needs.length).map((node) => node.id);
  const layers = new Map<string, number>();
  const ordered: RunGraphNode[] = [];
  for (const id of ready) {
    const node = byId.get(id)!;
    const layer = node.needs.reduce(
      (depth, need) => Math.max(depth, (layers.get(need) ?? 0) + 1),
      0,
    );
    layers.set(id, layer);
    ordered.push(node);
    for (const child of children.get(id) ?? []) {
      const remaining = (pending.get(child) ?? 1) - 1;
      pending.set(child, remaining);
      if (!remaining) ready.push(child);
    }
  }
  const columns = new Map<number, RunGraphNode[]>();
  for (const node of ordered) {
    const layer = layers.get(node.id)!;
    columns.set(layer, [...(columns.get(layer) ?? []), node]);
  }
  const skipEdges = ordered.flatMap((node) =>
    node.needs
      .filter((need) => layers.get(node.id)! - (layers.get(need) ?? 0) > 1)
      .map((need) => `${need}:${node.id}`),
  );
  const lanes = new Map(skipEdges.map((edge, index) => [edge, 12 + index * 18]));
  const laneSpace = lanes.size * 18;
  const nodeHeight = (node: RunGraphNode) => heights[node.id] ?? 76;
  const columnHeight = (column: RunGraphNode[]) =>
    column.reduce((sum, node) => sum + nodeHeight(node), 0) + Math.max(0, column.length - 1) * 24;
  const contentHeight = Math.max(120, ...[...columns.values()].map(columnHeight));
  const positions: GraphPosition[] = [];
  for (const [layer, column] of columns) {
    let y = 24 + laneSpace + (contentHeight - columnHeight(column)) / 2;
    for (const node of column) {
      positions.push({ node, x: 24 + layer * 312, y, width: 240, height: nodeHeight(node), layer });
      y += nodeHeight(node) + 24;
    }
  }
  const placed = new Map(positions.map((position) => [position.node.id, position]));
  const edges = positions.flatMap((target) =>
    target.node.needs.flatMap((need) => {
      const source = placed.get(need);
      if (!source) return [];
      const x = source.x + source.width;
      const y = source.y + source.height / 2;
      const endY = target.y + target.height / 2;
      const lane = lanes.get(`${need}:${target.node.id}`);
      // Skip-level edges exit through column gaps and travel above every node.
      // The explicit route also allows obstacle clearance to be checked directly.
      let route: RoutePoint[] | undefined;
      let path = `M ${x} ${y} C ${x + 36} ${y}, ${target.x - 36} ${endY}, ${target.x} ${endY}`;
      if (lane !== undefined) {
        route = [
          { x, y },
          { x: x + 24, y },
          { x: x + 24, y: lane },
          { x: target.x - 24, y: lane },
          { x: target.x - 24, y: endY },
          { x: target.x, y: endY },
        ];
        path = roundedRoute(route);
      }
      const edge: GraphEdge = { from: need, to: target.node.id, route, path };
      return [edge];
    }),
  );
  return {
    positions,
    edges,
    width: Math.max(288, columns.size * 312 - 24),
    height: contentHeight + laneSpace + 48,
    unresolved: nodes.filter((node) => !placed.has(node.id)),
  };
}
