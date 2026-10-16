import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { RunnerRemovalSection } from './RunnerRemovalSection';

it('explains what deleting removes and how to keep the files', () => {
  render(<RunnerRemovalSection deregistered={false} locked={false} connected onAction={vi.fn()} />);
  expect(
    screen.getByText(
      'Stops the runner, removes it from GitHub, and deletes its files. To keep the files, stop it instead.',
    ),
  ).toBeVisible();
});
