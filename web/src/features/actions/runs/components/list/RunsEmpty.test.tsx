import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { RunsEmpty } from './RunsEmpty';

it('names the searched scope, or all repositories when no scope is chosen', () => {
  const { rerender } = render(
    <RunsEmpty scope={{ organization: '', repository: '' }} runnerName="mac-7" filtered={false} />,
  );
  expect(screen.getByText(/^Searched all repositories\. Runs appear/)).toBeTruthy();
  rerender(<RunsEmpty scope={{ organization: 'example', repository: '' }} filtered={false} />);
  expect(screen.getByText(/^Searched example with the selected status/)).toBeTruthy();
});
