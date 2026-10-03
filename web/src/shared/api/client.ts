import type { Snapshot } from './types';

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
  const response = await fetch(path, options);
  const data: unknown = await response.json();
  if (!response.ok) {
    let error = 'The operation failed.';
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
      error = data.error;
    }
    throw new Error(error);
  }
  return data as T;
}
export function getRunners(local: boolean, signal: AbortSignal) {
  if (local) return request<Snapshot>('/api/runners?local=1', undefined, signal);
  return request<Snapshot>('/api/runners', undefined, signal);
}
