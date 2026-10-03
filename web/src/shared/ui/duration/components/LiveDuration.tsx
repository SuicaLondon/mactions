import { useDuration } from '../../../hooks/use-duration';

interface LiveDurationProps {
  start?: string | null;
  end?: string | null;
  running?: boolean;
}

export function LiveDuration({ start, end, running = false }: LiveDurationProps) {
  return <>{useDuration(start, end, running)}</>;
}
