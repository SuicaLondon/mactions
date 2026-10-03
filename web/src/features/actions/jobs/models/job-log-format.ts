interface LogStyle {
  color?: string;
  rgb?: string;
  bold?: boolean;
  dim?: boolean;
  underline?: boolean;
}

interface LogPart {
  text: string;
  style: LogStyle;
}

export interface LogLine {
  parts: LogPart[];
  annotation?: 'error' | 'warning' | 'group' | 'command';
  newline: boolean;
}

const ansiColors = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
const ansiPalette = [
  '#484f58',
  '#ff7b72',
  '#7ee787',
  '#e3b341',
  '#79c0ff',
  '#d2a8ff',
  '#76e3ea',
  '#e6edf3',
  '#8b949e',
  '#ffa198',
  '#aff5b4',
  '#f8e3a1',
  '#a5d6ff',
  '#e2c5ff',
  '#b3f0ff',
  '#ffffff',
];

function ansi256Color(index: number) {
  if (index < 16) return ansiPalette[index];
  if (index >= 232) {
    const gray = 8 + (index - 232) * 10;
    return `rgb(${gray}, ${gray}, ${gray})`;
  }
  const value = index - 16;
  const channel = (number: number) => {
    if (number === 0) return 0;
    return 55 + number * 40;
  };
  return `rgb(${[Math.floor(value / 36), Math.floor(value / 6) % 6, value % 6].map(channel).join(', ')})`;
}

function applyAnsiCodes(style: LogStyle, codes: number[]): LogStyle {
  for (let index = 0; index < codes.length; index++) {
    const code = codes[index];
    switch (code) {
      case 0:
        style = {};
        break;
      case 1:
        style.bold = true;
        break;
      case 2:
        style.dim = true;
        break;
      case 4:
        style.underline = true;
        break;
      case 22:
        style.bold = false;
        style.dim = false;
        break;
      case 24:
        style.underline = false;
        break;
      case 39:
        style.color = undefined;
        style.rgb = undefined;
        break;
      case 38:
      case 48: {
        const mode = codes[++index];
        let valueCount = 0;
        if (mode === 2) valueCount = 3;
        else if (mode === 5) valueCount = 1;
        const values = codes.slice(index + 1, index + 1 + valueCount);
        index += values.length;
        if (
          code !== 38 ||
          !valueCount ||
          values.length !== valueCount ||
          !values.every((value) => Number.isInteger(value) && value >= 0 && value <= 255)
        )
          continue;
        style.color = undefined;
        if (mode === 2) style.rgb = `rgb(${values.join(', ')})`;
        else style.rgb = ansi256Color(values[0]);
        break;
      }
      default:
        if ((code >= 30 && code <= 37) || (code >= 90 && code <= 97)) {
          let prefix = '';
          if (code >= 90) prefix = 'bright-';
          style.color = `${prefix}${ansiColors[code % 10]}`;
          style.rgb = undefined;
        }
    }
  }
  return style;
}

function annotationFor(text: string): LogLine['annotation'] {
  const message = text.replace(/^\d{4}-\d{2}-\d{2}T\S+\s+/, '');
  if (/^(?:::error(?:\s.*?)?::|##?\[error\]|\[error\])/i.test(message)) return 'error';
  if (/^(?:::warning(?:\s.*?)?::|##?\[warning\]|\[warning\])/i.test(message)) return 'warning';
  if (/^(?:::(?:group|endgroup)::|##?\[(?:group|endgroup)\])/i.test(message)) return 'group';
  if (/^##?\[command\]/i.test(message)) return 'command';
}

export function parseJobLogLines(content: string): LogLine[] {
  let currentLine: LogLine = { parts: [], newline: false };
  const lines = [currentLine];
  let style: LogStyle = {};
  let offset = 0;
  function append(text: string) {
    text.split('\n').forEach((part, index) => {
      if (index) {
        currentLine.newline = true;
        currentLine = { parts: [], newline: false };
        lines.push(currentLine);
      }
      if (part) currentLine.parts.push({ text: part, style: { ...style } });
    });
  }
  // eslint-disable-next-line no-control-regex -- ANSI sequences contain the ESC control character.
  const sequence = /(?:\u001b|\^\[)\[([0-?]*)([ -/]*)([@-~])/g;
  for (const match of content.matchAll(sequence)) {
    append(content.slice(offset, match.index));
    offset = match.index + match[0].length;
    if (match[3] !== 'm' || match[2] || !/^[\d;]*$/.test(match[1])) continue;
    let codes = [0];
    if (match[1]) codes = match[1].split(';').map(Number);
    style = applyAnsiCodes(style, codes);
  }
  append(content.slice(offset));
  if (lines.length > 1 && !currentLine.parts.length) lines.pop();
  for (const line of lines) {
    const annotation = annotationFor(line.parts.map((part) => part.text).join(''));
    if (annotation) line.annotation = annotation;
  }
  return lines;
}
