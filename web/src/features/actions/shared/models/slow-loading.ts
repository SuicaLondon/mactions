/** Seconds before a loading line admits the wait is long and starts counting. */
export const slowLoadingSeconds = 5;

/** Keeps the initial message briefly, then reports elapsed time so long waits look alive. */
export function slowLoadingMessage(message: string, slowMessage: string, seconds: number) {
  if (seconds < slowLoadingSeconds) return message;
  return `${slowMessage} (${seconds}s)`;
}
