import type { Snapshot } from './types';

export const UNREACHABLE_MESSAGE =
  'Could not reach mactions. Check that the manager is running, then retry.';

/**
 * The request never reached the manager, so the server state is unknown.
 * It stays a TypeError, like the fetch failure it replaces, for callers that detect one.
 */
export class NetworkError extends TypeError {
  constructor() {
    super(UNREACHABLE_MESSAGE);
    this.name = 'NetworkError';
  }
}

/** Replaces the browser's network TypeError; aborts and other errors pass through unchanged. */
async function network<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof TypeError) throw new NetworkError();
    throw error;
  }
}

function send(path: string, options: RequestInit) {
  return network(() => fetch(path, options));
}

async function readBody(response: Response): Promise<unknown> {
  // The connection can drop after the headers arrive, while the body is still streaming.
  const text = await network(() => response.text());
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function errorMessage(data: unknown, status: number) {
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    return data.error;
  }
  return `The server returned HTTP ${status}. Check that the manager is running, then retry.`;
}

export async function request<T>(
  path: string,
  payload?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  let options: RequestInit = { signal };
  if (payload !== undefined) {
    options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Mactions': '1' },
      body: JSON.stringify(payload),
      // Mutations are intentionally not aborted when a dialog or page observer closes.
    };
  }
  const response = await send(path, options);
  const data = await readBody(response);
  if (!response.ok) throw new Error(errorMessage(data, response.status));
  if (data === undefined && response.status !== 204) {
    throw new Error(
      `The server returned an unreadable response (HTTP ${response.status}). Check that the manager is running, then retry.`,
    );
  }
  return data as T;
}

/** The runners this Mac manages, read without asking GitHub for their status. */
export function getLocalRunners(signal: AbortSignal) {
  return request<Snapshot>('/api/runners?local=1', undefined, signal);
}
