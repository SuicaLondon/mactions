import { cn } from '../../../../../shared/lib/cn';
import { type LogLine } from '../../models/job-log-format';

const ansiClasses: Record<string, string> = {
  black: 'log-ansi-black text-slate-400',
  red: 'log-ansi-red text-red-400',
  green: 'log-ansi-green text-green-300',
  yellow: 'log-ansi-yellow text-amber-400',
  blue: 'log-ansi-blue text-sky-300',
  magenta: 'log-ansi-magenta text-purple-300',
  cyan: 'log-ansi-cyan text-blue-200',
  white: 'log-ansi-white text-slate-100',
  'bright-black': 'log-ansi-bright-black text-slate-400',
  'bright-red': 'log-ansi-bright-red text-red-300',
  'bright-green': 'log-ansi-bright-green text-green-200',
  'bright-yellow': 'log-ansi-bright-yellow text-amber-200',
  'bright-blue': 'log-ansi-bright-blue text-blue-200',
  'bright-magenta': 'log-ansi-bright-magenta text-purple-50',
  'bright-cyan': 'log-ansi-bright-cyan text-cyan-200',
  'bright-white': 'log-ansi-bright-white text-white',
};

const annotationClasses: Record<string, string> = {
  error: 'log-line-error text-red-400 bg-activity-failure/10',
  warning: 'log-line-warning text-amber-400 bg-activity-running/10',
  group: 'log-line-group font-semibold text-sky-300',
  command: 'log-line-command text-blue-200',
};

export function JobLogLine({ line, number }: { line: LogLine; number: number }) {
  return (
    <span>
      <span
        className={cn(
          'job-log-line inline-block min-h-5 min-w-full pr-4 hover:bg-slate-900',
          'before:inline-block before:w-12 before:pr-3.5 before:text-right',
          'before:text-slate-500 before:content-[attr(data-line)] before:select-none',
          annotationClasses[line.annotation ?? ''],
        )}
        data-line={number}
      >
        {line.parts.map((part, index) => {
          let style;
          if (part.style.rgb) style = { color: part.style.rgb };
          return (
            <span
              // eslint-disable-next-line react-x/no-array-index-key -- ANSI segments are immutable within their log line.
              key={index}
              className={cn(ansiClasses[part.style.color ?? ''], {
                'log-ansi-bold font-bold': part.style.bold,
                'log-ansi-dim opacity-70': part.style.dim,
                'log-ansi-underline underline': part.style.underline,
              })}
              style={style}
            >
              {part.text}
            </span>
          );
        })}
      </span>
      {!!line.newline && '\n'}
    </span>
  );
}
