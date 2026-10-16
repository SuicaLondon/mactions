import type { LogLine } from './job-log-format';

export interface LogErrorLine {
  number: number;
  text: string;
}

const errorPrefix =
  /^(?:\d{4}-\d{2}-\d{2}T\S+\s+)?(?:::error(?:\s.*?)?::|##?\[error\]|\[error\])\s*/i;

/**
 * Lists GitHub error annotations with their 1-based line numbers in the output.
 *
 * Only explicit error annotations are pinned. Test-runner markers such as `FAIL`, `✕`, or
 * `Error:` also appear in passing output (test names, expected-error assertions, retries),
 * so pinning them would bury the real annotation; search finds them instead.
 */
export function logErrorLines(lines: LogLine[]): LogErrorLine[] {
  const errors: LogErrorLine[] = [];
  lines.forEach((line, index) => {
    if (line.annotation !== 'error') return;
    const text = line.parts.map((part) => part.text).join('');
    errors.push({ number: index + 1, text: text.replace(errorPrefix, '') || 'Error' });
  });
  return errors;
}

/**
 * Whether the log output scrolls itself. At phone width the output grows with its content
 * and the surrounding page scrolls instead, so setting `scrollTop` would do nothing.
 */
export function logScrollsItself(output: HTMLElement) {
  return output.scrollHeight > output.clientHeight;
}

/**
 * Scrolls a log output element so the given line sits near the top third. When the output
 * does not scroll itself, the nearest scrolling ancestor centres the line instead; the
 * page only moves in that case, so desktop layouts keep their position.
 */
export function scrollLogToLine(output: HTMLElement, number: number) {
  const line = output.querySelector(`[data-line="${number}"]`);
  if (!line) return;
  if (!logScrollsItself(output)) {
    line.scrollIntoView({ block: 'center' });
    return;
  }
  const offset = line.getBoundingClientRect().top - output.getBoundingClientRect().top;
  output.scrollTop = Math.max(0, output.scrollTop + offset - output.clientHeight / 3);
}
