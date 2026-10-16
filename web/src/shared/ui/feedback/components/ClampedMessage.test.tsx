import { render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { ClampedMessage } from './ClampedMessage';

let observers: ResizeObserverCallback[] = [];

afterEach(() => {
  observers = [];
  vi.unstubAllGlobals();
});

it('offers Details with the full text only while the message is clamped', async () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        observers.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  );
  render(<ClampedMessage>The runner exited. Open the diagnostic logs for details.</ClampedMessage>);
  expect(screen.queryByRole('button', { name: 'Details' })).not.toBeInTheDocument();
  const text = screen.getByText(/The runner exited/);
  Object.defineProperty(text, 'scrollHeight', { configurable: true, value: 48 });
  Object.defineProperty(text, 'clientHeight', { configurable: true, value: 32 });
  observers.forEach((callback) => callback([], {} as ResizeObserver));
  expect(await screen.findByRole('button', { name: 'Details' })).toHaveAttribute('popovertarget');
});
