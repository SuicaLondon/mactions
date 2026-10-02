import type { Snapshot } from './types';

export async function request<T>(path: string, payload?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, payload === undefined ? { signal } : {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Mactions': '1' },
    body: JSON.stringify(payload),
    // Mutations are intentionally not aborted when a dialog or page observer closes.
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The operation failed.');
  return data as T;
}
export const getRunners = (local: boolean, signal: AbortSignal) =>
  request<Snapshot>(`/api/runners${local ? '?local=1' : ''}`, undefined, signal);
