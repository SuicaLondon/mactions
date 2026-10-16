import { useEffect, useRef } from 'react';

import type { LogSnapshot } from '../../../../shared/api/types';

/** Keeps the log output scrolled to its end while following, including after a wrap change. */
export function useFollowedLogOutput(
  snapshot: LogSnapshot | undefined,
  follow: boolean,
  wrap: boolean,
) {
  const output = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (follow && output.current) output.current.scrollTop = output.current.scrollHeight;
  }, [snapshot, follow, wrap]);
  return output;
}
