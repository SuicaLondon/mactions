import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { addMilliseconds, getTime, parseISO } from 'date-fns';
import { afterEach, expect, it, vi } from 'vitest';

import type { Job } from '../../../../shared/api/types';
import { formatUtcTimestamp } from '../../../../shared/lib/date';
import type { CIRecording } from '../../types/recording';
import { ReplayPanel } from './ReplayPanel';

const start = getTime(parseISO('2026-09-30T10:00:00Z'));
const job: Job = {
  id: 10,
  name: 'Build',
  workflow: 'CI',
  run_number: 42,
  run_id: 900,
  status: 'in_progress',
  conclusion: null,
  branch: 'main',
  started_at: formatUtcTimestamp(start),
  completed_at: null,
  url: 'https://github.com/example/build/actions/runs/900/job/10',
  steps: [{ number: 1, name: 'Compile', status: 'in_progress', conclusion: null }],
};
const recording: CIRecording = {
  version: 1,
  repository: 'example/build',
  run_id: 900,
  started_at: formatUtcTimestamp(start),
  finished_at: formatUtcTimestamp(addMilliseconds(start, 10_000)),
  frames: [
    { at: start, jobs: [job] },
    {
      at: getTime(addMilliseconds(start, 10_000)),
      jobs: [
        {
          ...job,
          status: 'completed',
          conclusion: 'success',
          completed_at: formatUtcTimestamp(addMilliseconds(start, 10_000)),
          steps: [{ ...job.steps[0], status: 'completed', conclusion: 'success' }],
        },
      ],
    },
  ],
  logs: {
    '10:1': {
      state: 'available',
      message: '',
      content: '2026-09-30T10:00:02Z compiling\n2026-09-30T10:00:09Z finished',
      steps: [],
    },
  },
};
let client: QueryClient;
const fetchMock = vi.fn<typeof fetch>();

function renderPanel(source: CIRecording = recording) {
  vi.stubGlobal('fetch', fetchMock);
  client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <ReplayPanel recording={source} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  client.clear();
  fetchMock.mockReset();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('starts paused, seeks sparse snapshots, and reads recorded step output without live requests', () => {
  renderPanel();
  expect(screen.getByRole('button', { name: 'Play replay' })).toBeVisible();
  const timeline = screen.getByRole('slider', { name: 'Replay timeline' });
  expect(timeline).toHaveValue('0');
  fireEvent.change(timeline, { target: { value: 5_000 } });
  expect(screen.getByRole('button', { name: 'Build, Running, CI #42' })).toBeVisible();
  const step = screen.getByRole('region', { name: 'Output for Compile' });
  expect(within(step).getByText(/compiling/)).toBeVisible();
  expect(within(step).queryByText(/finished/)).not.toBeInTheDocument();
  fireEvent.change(timeline, { target: { value: 10_000 } });
  expect(screen.getByRole('button', { name: 'Build, Success, CI #42' })).toBeVisible();
  expect(within(step).getByText(/finished/)).toBeVisible();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('plays at the chosen speed and stops at the end', () => {
  vi.useFakeTimers();
  renderPanel();
  const speed = screen.getByRole('combobox', { name: 'Playback speed' });
  fireEvent.keyDown(speed, { key: 'ArrowDown' });
  fireEvent.keyDown(speed, { key: 'ArrowDown' });
  fireEvent.keyDown(speed, { key: 'Enter' });
  const slider = screen.getByRole('slider');
  fireEvent.click(screen.getByRole('button', { name: 'Play replay' }));
  act(() => vi.advanceTimersByTime(1000));
  expect(slider).toHaveValue('4000');
  fireEvent.click(screen.getByRole('button', { name: 'Pause replay' }));
  act(() => vi.advanceTimersByTime(1000));
  expect(slider).toHaveValue('4000');
  fireEvent.click(screen.getByRole('button', { name: 'Play replay' }));
  act(() => vi.advanceTimersByTime(2000));
  expect(slider).toHaveValue('10000');
  expect(screen.getByRole('button', { name: 'Play replay' })).toHaveTextContent('Replay');
});

it('offers practical keyboard seeking and preserves an exact partial-second endpoint', () => {
  renderPanel({
    ...recording,
    finished_at: formatUtcTimestamp(addMilliseconds(start, 10_423)),
    logs: {
      '10:1': {
        ...recording.logs['10:1'],
        content: '2026-09-30T10:00:10.423Z endpoint\n2026-09-30T10:00:10.424Z later',
      },
    },
  });
  const timeline = screen.getByRole('slider');
  expect(timeline).toHaveAttribute('max', '10423');
  fireEvent.keyDown(timeline, { key: 'ArrowRight' });
  expect(timeline).toHaveValue('1000');
  expect(timeline).toHaveAttribute('aria-valuetext', '0:01 of 0:10');
  fireEvent.keyDown(timeline, { key: 'PageUp' });
  expect(timeline).toHaveValue('10423');
  const step = screen.getByRole('region', { name: 'Output for Compile' });
  expect(within(step).getByText(/endpoint/)).toBeVisible();
  expect(within(step).queryByText(/later/)).not.toBeInTheDocument();
  for (const [key, value] of [
    ['ArrowLeft', '9423'],
    ['End', '10423'],
    ['Home', '0'],
    ['PageDown', '0'],
  ]) {
    fireEvent.keyDown(timeline, { key });
    expect(timeline).toHaveValue(value);
  }
});
