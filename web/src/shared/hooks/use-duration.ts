import { getTime } from 'date-fns';
import { useEffect, useState } from 'react';

import { duration } from '../lib/activity-format';
import { currentDate } from '../lib/date';
import { usePageVisible } from './use-page-visible';

export function useDuration(
  start: string | null | undefined,
  end: string | null | undefined,
  running = false,
) {
  const [now, setNow] = useState(currentDate);
  const visible = usePageVisible();
  const active = Boolean(start && !end && running && visible);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(currentDate()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return duration(start, end, running, getTime(now));
}
