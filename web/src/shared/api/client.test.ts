import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { NetworkError, request } from './client';

const fetchMock = vi.fn<typeof fetch>();
const unreachable = 'Could not reach mactions. Check that the manager is running, then retry.';

function reply(body: string, status: number, contentType = 'application/json') {
  return new Response(body, { status, headers: { 'Content-Type': contentType } });
}

/** A successful response whose body read fails with `error`. */
function droppedBody(error: Error) {
  const response = reply('{"ok":true}', 200);
  vi.spyOn(response, 'text').mockRejectedValue(error);
  return response;
}

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

it('returns parsed JSON for successful responses', async () => {
  fetchMock.mockResolvedValue(reply('{"ok":true}', 200));
  await expect(request('/api/test')).resolves.toEqual({ ok: true });
});

it.each([
  ['a JSON error body', reply('{"error":"Runner is busy."}', 409), 'Runner is busy.'],
  [
    'a non-JSON error body',
    reply('<html>Bad gateway</html>', 502, 'text/html'),
    'The server returned HTTP 502. Check that the manager is running, then retry.',
  ],
  [
    'an empty error body',
    reply('', 500, 'text/plain'),
    'The server returned HTTP 500. Check that the manager is running, then retry.',
  ],
])('reports %s', async (_label, response, message) => {
  fetchMock.mockResolvedValue(response);
  await expect(request('/api/test')).rejects.toThrow(message);
});

it('explains network failures during the request or body read as NetworkError', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  const failed = request('/api/test');
  await expect(failed).rejects.toBeInstanceOf(NetworkError);
  await expect(failed).rejects.toBeInstanceOf(TypeError);
  await expect(failed).rejects.toThrow(unreachable);

  fetchMock.mockResolvedValueOnce(droppedBody(new TypeError('network error')));
  await expect(request('/api/test')).rejects.toThrow(unreachable);
});

it('rethrows aborts during the request or body read unchanged', async () => {
  const abort = new DOMException('The operation was aborted.', 'AbortError');
  fetchMock.mockRejectedValueOnce(abort);
  await expect(request('/api/test')).rejects.toBe(abort);
  fetchMock.mockResolvedValueOnce(droppedBody(abort));
  await expect(request('/api/test')).rejects.toBe(abort);
});
