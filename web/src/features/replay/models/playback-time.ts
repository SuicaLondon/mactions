import { millisecondsToSeconds, minutesToSeconds, secondsToMinutes } from 'date-fns';

export function duration(milliseconds: number) {
  const seconds = Math.max(0, millisecondsToSeconds(milliseconds));
  const minutes = secondsToMinutes(seconds);
  return `${minutes}:${String(seconds - minutesToSeconds(minutes)).padStart(2, '0')}`;
}
