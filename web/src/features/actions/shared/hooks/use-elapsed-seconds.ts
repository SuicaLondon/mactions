import { useEffect, useState } from 'react';

import { currentDate } from '../../../../shared/lib/date';

/** Counts whole seconds since the calling component mounted. */
export function useElapsedSeconds() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = currentDate().getTime();
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((currentDate().getTime() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return seconds;
}
