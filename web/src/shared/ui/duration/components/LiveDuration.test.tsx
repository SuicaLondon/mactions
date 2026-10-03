import { act, render, screen } from '@testing-library/react';
import { parseISO } from 'date-fns';
import { afterEach, expect, it, vi } from 'vitest';

import { LiveDuration } from './LiveDuration';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function DurationParent({ onRender }: { onRender: () => void }) {
  onRender();
  return <LiveDuration start="2026-10-04T00:00:00Z" running />;
}

it('updates running durations without rerendering the parent and pauses while hidden', () => {
  vi.useFakeTimers();
  vi.setSystemTime(parseISO('2026-10-04T00:00:10Z'));
  let hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  const onRender = vi.fn();
  render(<DurationParent onRender={onRender} />);
  expect(screen.getByText('10s')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText('11s')).toBeInTheDocument();
  act(() => {
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.getByText('11s')).toBeInTheDocument();
  act(() => {
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText('17s')).toBeInTheDocument();
  expect(onRender).toHaveBeenCalledTimes(1);
});
