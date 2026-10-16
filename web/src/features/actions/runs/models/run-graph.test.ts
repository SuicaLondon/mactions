import { describe, expect, it } from 'vitest';

import { makeJobSummary } from '../../../../test/activity-fixtures';
import {
  graphDependencyLabels,
  graphLevels,
  graphNodeLabel,
  graphPositionLabel,
  graphScrollTargets,
  layoutRunGraph,
  type RunGraphNode,
} from './run-graph';

const node = (id: string, needs: string[] = []): RunGraphNode => ({
  id,
  name: id,
  needs,
  job_ids: [],
  matrix: false,
  reusable: false,
});

describe('source-defined pipeline layout', () => {
  it('places parallel branches and their join using needs, regardless of runtime order', () => {
    const layout = layoutRunGraph([
      node('deploy', ['test', 'lint']),
      node('lint', ['build']),
      node('build'),
      node('test', ['build']),
    ]);
    const layer = Object.fromEntries(
      layout.positions.map((position) => [position.node.id, position.layer]),
    );
    expect(layer).toEqual({ build: 0, lint: 1, test: 1, deploy: 2 });
    expect(layout.edges.map((edge) => `${edge.from}->${edge.to}`).sort()).toEqual([
      'build->lint',
      'build->test',
      'lint->deploy',
      'test->deploy',
    ]);
    expect(layout.edges.some((edge) => edge.from === 'lint' && edge.to === 'test')).toBe(false);
  });

  it('reserves matrix group height without overlapping parallel nodes', () => {
    const layout = layoutRunGraph(
      [node('build'), node('test', ['build']), node('lint', ['build'])],
      { test: 276 },
    );
    const test = layout.positions.find((position) => position.node.id === 'test')!;
    const lint = layout.positions.find((position) => position.node.id === 'lint')!;
    expect(test.height).toBe(276);
    expect(lint.y).toBeGreaterThanOrEqual(test.y + test.height + 24);
    expect(layout.height).toBeGreaterThan(lint.y + lint.height);
  });

  it('does not invent ordering for cycles or missing dependency definitions', () => {
    const layout = layoutRunGraph([
      node('known'),
      node('missing', ['unknown']),
      node('a', ['b']),
      node('b', ['a']),
    ]);
    expect(layout.positions.map((position) => position.node.id)).toEqual(['known']);
    expect(layout.edges).toEqual([]);
    expect(layout.unresolved.map((item) => item.id)).toEqual(['missing', 'a', 'b']);
  });
  it('routes skip-level dependencies around intermediate nodes, including tall matrix groups', () => {
    const layout = layoutRunGraph(
      [
        node('prepare'),
        node('build', ['prepare']),
        node('test', ['build']),
        node('deploy', ['test', 'prepare']),
      ],
      { build: 310, test: 156 },
    );
    const direct = layout.edges.find((edge) => edge.from === 'prepare' && edge.to === 'deploy')!;
    expect(direct.route).toBeDefined();
    const route = direct.route!;
    const intermediate = layout.positions.filter((position) =>
      ['build', 'test'].includes(position.node.id),
    );
    for (const [start, end] of route.slice(1).map((point, index) => [route[index], point])) {
      for (const box of intermediate) {
        const overlapsX =
          Math.max(start.x, end.x) > box.x && Math.min(start.x, end.x) < box.x + box.width;
        const overlapsY =
          Math.max(start.y, end.y) > box.y && Math.min(start.y, end.y) < box.y + box.height;
        expect(overlapsX && overlapsY).toBe(false);
      }
    }
    const source = layout.positions.find((position) => position.node.id === 'prepare')!;
    const target = layout.positions.find((position) => position.node.id === 'deploy')!;
    expect(route[0]).toEqual({ x: source.x + source.width, y: source.y + source.height / 2 });
    expect(route.at(-1)).toEqual({ x: target.x, y: target.y + target.height / 2 });
    expect(
      layout.edges.filter((edge) => edge !== direct).every((edge) => edge.route === undefined),
    ).toBe(true);
  });
});

describe('graph labels', () => {
  it('names nodes without unevaluated expressions', () => {
    expect(graphNodeLabel({ ...node('build'), name: 'Build app' })).toBe('Build app');
    expect(graphNodeLabel({ ...node('test'), name: 'Test ${{ matrix.os }}' })).toBe('test');
    expect(graphNodeLabel({ ...node('lint'), name: '' })).toBe('lint');
  });

  it('names the dependencies of a positioned node', () => {
    const nodes = [{ ...node('build'), name: 'Build app' }, node('test', ['build', 'gone'])];
    expect(graphPositionLabel(nodes[0], nodes)).toBe('Build app, no dependencies');
    expect(graphPositionLabel(nodes[1], nodes)).toBe('test, depends on Build app, gone');
    expect(graphDependencyLabels(nodes[1], nodes)).toEqual(['Build app', 'gone']);
  });
});

describe('graphLevels', () => {
  it('groups nodes by dependency level in order, top to bottom within a level', () => {
    const layout = layoutRunGraph([
      node('deploy', ['test', 'lint']),
      node('lint', ['build']),
      node('build'),
      node('test', ['build']),
    ]);
    const levels = graphLevels(layout).map((level) => level.map((position) => position.node.id));
    expect(levels).toEqual([['build'], ['lint', 'test'], ['deploy']]);
  });
});

describe('graphScrollTargets', () => {
  it('targets the first failed node and the root column', () => {
    const layout = layoutRunGraph([node('build'), node('test', ['build'])]);
    const failed = makeJobSummary({ name: 'test', conclusion: 'failure' });
    const targets = graphScrollTargets(layout, new Map([['test', [failed]]]));
    expect(targets.failure?.node.id).toBe('test');
    expect(targets.root?.node.id).toBe('build');
    expect(graphScrollTargets(layout, new Map()).failure).toBeUndefined();
  });
});
