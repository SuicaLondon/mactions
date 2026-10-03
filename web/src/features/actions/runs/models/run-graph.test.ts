import { describe, expect, it } from 'vitest';

import { layoutRunGraph, type RunGraphNode } from './run-graph';

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
    for (let index = 1; index < route.length; index++) {
      const start = route[index - 1];
      const end = route[index];
      for (const obstacle of intermediate) {
        let crosses: boolean;
        if (start.x === end.x) {
          crosses =
            start.x > obstacle.x &&
            start.x < obstacle.x + obstacle.width &&
            Math.max(start.y, end.y) > obstacle.y &&
            Math.min(start.y, end.y) < obstacle.y + obstacle.height;
        } else {
          crosses =
            start.y > obstacle.y &&
            start.y < obstacle.y + obstacle.height &&
            Math.max(start.x, end.x) > obstacle.x &&
            Math.min(start.x, end.x) < obstacle.x + obstacle.width;
        }
        expect(crosses).toBe(false);
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
