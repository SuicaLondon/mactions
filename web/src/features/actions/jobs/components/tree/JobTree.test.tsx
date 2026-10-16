import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';

import { makeJob, makeJobSummary } from '../../../../../test/activity-fixtures';
import type { JobSummary } from '../../../data/types/activity-types';
import type { JobSelection } from '../../types/job-selection';
import { JobTree } from './JobTree';

const summary = makeJobSummary();
const jobs: JobSummary[] = [summary, { ...summary, id: 2, name: 'Test' }];
const detail = makeJob({
  steps: [{ number: 1, name: 'Compile', status: 'completed', conclusion: 'success' }],
});

function Tree({ onSelect }: { onSelect: (selection: JobSelection) => void }) {
  const [selected, setSelected] = useState<JobSelection | null>(null);
  const [expanded, setExpanded] = useState<number[]>([]);
  return (
    <JobTree
      jobs={jobs}
      loadedJobs={{ 1: detail }}
      selected={selected}
      expandedJobIds={expanded}
      onSelect={(selection) => {
        onSelect(selection);
        setSelected(selection);
      }}
      onToggle={(jobId, open) =>
        setExpanded((ids) => {
          const rest = ids.filter((id) => id !== jobId);
          if (open) rest.push(jobId);
          return rest;
        })
      }
    />
  );
}

it('selects and expands jobs, selects steps, and moves the Tab stop with focus', async () => {
  const onSelect = vi.fn();
  render(<Tree onSelect={onSelect} />);
  const build = screen.getByRole('treeitem', { name: /^Build,/ });
  const test = screen.getByRole('treeitem', { name: /^Test,/ });
  expect(build).toHaveAttribute('tabindex', '0');
  expect(test).toHaveAttribute('tabindex', '-1');

  await userEvent.click(build);
  expect(onSelect).toHaveBeenLastCalledWith({ jobId: 1 });
  expect(build).toHaveAttribute('aria-expanded', 'true');
  expect(build).toHaveAttribute('aria-selected', 'true');

  const step = screen.getByRole('treeitem', { name: 'Compile, Success' });
  await userEvent.click(step);
  expect(onSelect).toHaveBeenLastCalledWith({ jobId: 1, stepNumber: 1 });
  expect(step).toHaveAttribute('aria-selected', 'true');
  expect(build).toHaveAttribute('aria-selected', 'false');
  expect(step).toHaveAttribute('tabindex', '0');
  expect(build).toHaveAttribute('tabindex', '-1');

  await userEvent.keyboard('{ArrowUp}');
  expect(build).toHaveFocus();
  expect(build).toHaveAttribute('tabindex', '0');

  const disclosure = build.querySelector('[data-disclosure]');
  if (!disclosure) throw new Error('Missing disclosure');
  await userEvent.click(disclosure);
  expect(build).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('treeitem', { name: 'Compile, Success' })).not.toBeInTheDocument();
});
