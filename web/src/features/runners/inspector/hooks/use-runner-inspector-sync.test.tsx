import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useRef } from 'react';
import { beforeEach, expect, it } from 'vitest';

import { useRunnerInspectorStore } from '../stores/runner-inspector-store';
import { useRunnerInspectorSync } from './use-runner-inspector-sync';

// Mounts the sync as the details panel does, beside whatever else the page shows.
function DetailsPanel({ children }: { children?: ReactNode }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useRunnerInspectorSync({ rows: [], loaded: false, blocked: false, closeButton });
  return (
    <>
      <button ref={closeButton} type="button">
        Close details
      </button>
      {children}
    </>
  );
}

beforeEach(() => {
  useRunnerInspectorStore.getState().reset();
  useRunnerInspectorStore.getState().openDetails({ key: 'runner-1', name: 'runner-1' });
});

it('closes the details panel on Escape', async () => {
  render(<DetailsPanel />);
  await userEvent.setup().keyboard('{Escape}');
  expect(useRunnerInspectorStore.getState().details).toBeNull();
});

it('leaves Escape to a dialog open above the panel', async () => {
  render(
    <DetailsPanel>
      <dialog open aria-label="Keyboard shortcuts" />
    </DetailsPanel>,
  );
  await userEvent.setup().keyboard('{Escape}');
  expect(useRunnerInspectorStore.getState().details).toMatchObject({ key: 'runner-1' });
});
