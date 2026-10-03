import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import type { JobSelection } from '../types/job-selection';
import { useJobTree } from './use-job-tree';

function Tree({
  expandedJobIds = [],
  onSelect,
  onToggle,
}: {
  expandedJobIds?: number[];
  onSelect: (selection: JobSelection) => void;
  onToggle: (jobId: number, expanded: boolean) => void;
}) {
  const { tree, keyboard } = useJobTree([], expandedJobIds, onSelect, onToggle);
  return (
    <ul ref={tree}>
      <li>
        <button role="treeitem" data-node="job-1" onKeyDown={(event) => keyboard(event, 1)}>
          First job
        </button>
      </li>
      <li>
        <button
          role="treeitem"
          data-node="job-1-step-1"
          data-parent="job-1"
          onKeyDown={(event) => keyboard(event, 1, 1)}
        >
          First step
        </button>
      </li>
      <li>
        <button role="treeitem" data-node="job-2" onKeyDown={(event) => keyboard(event, 2)}>
          Second job
        </button>
      </li>
    </ul>
  );
}

test.each([
  ['ArrowDown', 'First job', 'First step'],
  ['ArrowUp', 'First step', 'First job'],
  ['Home', 'Second job', 'First job'],
  ['End', 'First job', 'Second job'],
])('%s moves focus between visible tree rows', (key, origin, target) => {
  const onSelect = vi.fn();
  const onToggle = vi.fn();
  render(<Tree onSelect={onSelect} onToggle={onToggle} />);
  const row = screen.getByRole('treeitem', { name: origin });
  row.focus();
  expect(fireEvent.keyDown(row, { key })).toBe(false);
  expect(screen.getByRole('treeitem', { name: target })).toHaveFocus();
  expect(onSelect).not.toHaveBeenCalled();
  expect(onToggle).not.toHaveBeenCalled();
});

test('right and left arrows expand jobs and move between jobs and their steps', () => {
  const onSelect = vi.fn();
  const onToggle = vi.fn();
  const { rerender } = render(<Tree onSelect={onSelect} onToggle={onToggle} />);
  const job = screen.getByRole('treeitem', { name: 'First job' });
  const step = screen.getByRole('treeitem', { name: 'First step' });
  job.focus();
  expect(fireEvent.keyDown(job, { key: 'ArrowRight' })).toBe(false);
  expect(onSelect).toHaveBeenCalledWith({ jobId: 1 });
  expect(onToggle).toHaveBeenCalledWith(1, true);
  expect(job).toHaveFocus();

  rerender(<Tree expandedJobIds={[1]} onSelect={onSelect} onToggle={onToggle} />);
  expect(fireEvent.keyDown(job, { key: 'ArrowRight' })).toBe(false);
  expect(step).toHaveFocus();
  expect(fireEvent.keyDown(step, { key: 'ArrowLeft' })).toBe(false);
  expect(job).toHaveFocus();
  expect(fireEvent.keyDown(job, { key: 'ArrowLeft' })).toBe(false);
  expect(onToggle).toHaveBeenLastCalledWith(1, false);
  expect(onSelect).toHaveBeenCalledTimes(1);
});

test('right arrows on steps and unrelated keys keep their native behavior', () => {
  const onSelect = vi.fn();
  const onToggle = vi.fn();
  render(<Tree expandedJobIds={[1]} onSelect={onSelect} onToggle={onToggle} />);
  const step = screen.getByRole('treeitem', { name: 'First step' });
  step.focus();
  expect(fireEvent.keyDown(step, { key: 'ArrowRight' })).toBe(true);
  expect(fireEvent.keyDown(step, { key: 'Enter' })).toBe(true);
  expect(step).toHaveFocus();
  expect(onSelect).not.toHaveBeenCalled();
  expect(onToggle).not.toHaveBeenCalled();
});
