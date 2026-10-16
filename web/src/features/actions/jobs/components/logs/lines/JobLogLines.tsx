import { memo, useMemo } from 'react';

import { type LogLine } from '../../../models/job-log-format';
import { type LogMatch } from '../../../models/job-log-search';
import { JobLogLine } from './JobLogLine';

/**
 * Every output line with its search matches. Memoized so a long log re-renders only when its lines,
 * matches, or wrapping change.
 */
export const JobLogLines = memo(function JobLogLines({
  lines,
  empty,
  matches,
  active,
  wrap,
}: {
  lines: LogLine[];
  empty: boolean;
  matches: Map<number, LogMatch[]>;
  active: LogMatch | undefined;
  wrap: boolean;
}) {
  const timed = useMemo(() => lines.some((line) => line.time), [lines]);
  if (empty) return <>This log contains no output.</>;
  return (
    <>
      {lines.map((line, index) => {
        const number = index + 1;
        let activeStart: number | undefined;
        if (active?.line === number) activeStart = active.start;
        return (
          <JobLogLine
            // eslint-disable-next-line react-x/no-array-index-key -- Log line positions stay stable in this append-only output.
            key={index}
            line={line}
            number={number}
            matches={matches.get(number)}
            activeStart={activeStart}
            timed={timed}
            wrap={wrap}
          />
        );
      })}
    </>
  );
});
