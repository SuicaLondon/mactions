import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { PendingLabel } from './PendingLabel';

it.each([
  [false, 'Load more'],
  [true, 'Loading…'],
])('names the button for pending=%s with only the current label', (pending, name) => {
  render(
    <button type="button">
      <PendingLabel pending={pending} idle="Load more" busy="Loading…" />
    </button>,
  );
  expect(screen.getByRole('button')).toHaveAccessibleName(name);
});
