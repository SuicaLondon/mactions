import { memo } from 'react';

import { parseJobLogLines } from '../../models/job-log-format';
import { JobLogLine } from './JobLogLine';

export const JobLogLines = memo(function JobLogLines({ content }: { content: string }) {
  if (!content) return <>This log contains no output.</>;
  return (
    <>
      {parseJobLogLines(content).map((line, index) => (
        // eslint-disable-next-line react-x/no-array-index-key -- Log line positions stay stable in this append-only output.
        <JobLogLine key={index} line={line} number={index + 1} />
      ))}
    </>
  );
});
