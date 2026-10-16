import { memo, type ReactNode } from 'react';

import { cn } from '../../../../../../shared/lib/cn';
import { type LogLine } from '../../../models/job-log-format';
import { highlightParts, type LogMatch, type LogSegment } from '../../../models/job-log-search';
import { JobLogGutter } from './JobLogGutter';
import { JobLogMark } from './JobLogMark';

const ansiClasses: Record<string, string> = {
  black: 'text-slate-400',
  red: 'text-red-400',
  green: 'text-green-300',
  yellow: 'text-amber-400',
  blue: 'text-sky-300',
  magenta: 'text-purple-300',
  cyan: 'text-blue-200',
  white: 'text-slate-100',
  'bright-black': 'text-slate-400',
  'bright-red': 'text-red-300',
  'bright-green': 'text-green-200',
  'bright-yellow': 'text-amber-200',
  'bright-blue': 'text-blue-200',
  'bright-magenta': 'text-purple-50',
  'bright-cyan': 'text-cyan-200',
  'bright-white': 'text-white',
};

const annotationClasses: Record<string, string> = {
  error: 'text-red-400 bg-activity-failure/10',
  warning: 'text-amber-400 bg-activity-running/10',
  group: 'font-semibold text-sky-300',
  command: 'text-blue-200',
};

function partClassName(style: LogLine['parts'][number]['style']) {
  return cn(ansiClasses[style.color ?? ''], {
    'font-bold': style.bold,
    'opacity-70': style.dim,
    underline: style.underline,
  });
}

function partStyle(style: LogLine['parts'][number]['style']) {
  if (style.rgb) return { color: style.rgb };
  return undefined;
}

export const JobLogLine = memo(function JobLogLine({
  line,
  number,
  matches,
  activeStart,
  timed,
  wrap,
}: {
  line: LogLine;
  number: number;
  matches?: LogMatch[];
  activeStart?: number;
  /** Reserves the time column so lines without a timestamp stay aligned. */
  timed: boolean;
  /** Wrapped lines indent their continuation rows past the phone gutter. */
  wrap: boolean;
}) {
  let segments: LogSegment[] = line.parts;
  if (matches) segments = highlightParts(line.parts, matches, activeStart);
  return (
    <span>
      <span
        className={cn(
          'group inline-block min-h-5 min-w-full pr-4 hover:bg-slate-900',
          annotationClasses[line.annotation ?? ''],
          // A hanging indent the width of the phone gutter (time is hidden there).
          { 'max-md:pl-12 max-md:-indent-12': wrap },
        )}
        data-line={number}
        data-annotation={line.annotation}
      >
        <JobLogGutter number={number} time={line.time} timed={timed} />
        {segments.map((segment, index) => {
          let text: ReactNode = segment.text;
          if (segment.mark) text = <JobLogMark kind={segment.mark} text={segment.text} />;
          return (
            <span
              // eslint-disable-next-line react-x/no-array-index-key -- Segments are immutable for one line, query, and active match.
              key={index}
              className={partClassName(segment.style)}
              style={partStyle(segment.style)}
            >
              {text}
            </span>
          );
        })}
      </span>
      {!!line.newline && '\n'}
    </span>
  );
});
