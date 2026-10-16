import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { RunTable } from '../../../features/actions/runs/components/list/RunTable';
import { workflowRun } from '../../../test/app-harness';
import { findAdjacentRow, hasFocusedRow } from './keyboard-shortcuts';

afterEach(() => {
  document.body.replaceChildren();
});

function mountRuns() {
  render(
    <main>
      <RunTable runs={[workflowRun, { ...workflowRun, id: 421, number: 43 }]} onOpenRun={vi.fn()} />
    </main>,
  );
  return [
    screen.getByRole('button', { name: 'Open CI run #42 in example/build' }),
    screen.getByRole('button', { name: 'Open CI run #43 in example/build' }),
  ];
}

it('starts at the first row when no row has focus', () => {
  const [first] = mountRuns();
  expect(hasFocusedRow()).toBe(false);
  expect(findAdjacentRow(1)).toBe(first);
  expect(findAdjacentRow(-1)).toBe(first);
});

it('steps between run rows and clamps at the ends', () => {
  const [first, second] = mountRuns();
  first!.focus();
  expect(hasFocusedRow()).toBe(true);
  expect(findAdjacentRow(1)).toBe(second);
  expect(findAdjacentRow(-1)).toBe(first);
  second!.focus();
  expect(findAdjacentRow(1)).toBe(second);
});

it('treats focus on another control in a row as that row', () => {
  const [first, second] = mountRuns();
  screen.getByRole('link', { name: 'View run #42 on GitHub' }).focus();
  expect(hasFocusedRow()).toBe(true);
  expect(findAdjacentRow(1)).toBe(second);
  expect(findAdjacentRow(-1)).toBe(first);
});
