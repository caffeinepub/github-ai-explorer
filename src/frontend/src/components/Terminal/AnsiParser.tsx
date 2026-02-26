import React from 'react';

// ANSI color code to Tailwind/inline style mapping
const ANSI_COLORS: Record<number, string> = {
  30: '#4a4a4a', // black
  31: '#ff5555', // red
  32: '#50fa7b', // green
  33: '#f1fa8c', // yellow
  34: '#6272a4', // blue
  35: '#ff79c6', // magenta
  36: '#8be9fd', // cyan
  37: '#f8f8f2', // white
  90: '#6272a4', // bright black
  91: '#ff6e6e', // bright red
  92: '#69ff94', // bright green
  93: '#ffffa5', // bright yellow
  94: '#d6acff', // bright blue
  95: '#ff92df', // bright magenta
  96: '#a4ffff', // bright cyan
  97: '#ffffff', // bright white
};

const ANSI_BG_COLORS: Record<number, string> = {
  40: '#000000',
  41: '#ff5555',
  42: '#50fa7b',
  43: '#f1fa8c',
  44: '#6272a4',
  45: '#ff79c6',
  46: '#8be9fd',
  47: '#f8f8f2',
};

interface Span {
  text: string;
  color?: string;
  bgColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dim?: boolean;
}

function parseAnsi(text: string): Span[] {
  const spans: Span[] = [];
  // eslint-disable-next-line no-control-regex
  const ansiRegex = /\x1b\[([0-9;]*)m/g;
  let lastIndex = 0;
  let currentStyle: Omit<Span, 'text'> = {};

  let match: RegExpExecArray | null;
  while ((match = ansiRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      spans.push({ text: text.slice(lastIndex, match.index), ...currentStyle });
    }

    const codes = match[1].split(';').map(Number);
    for (const code of codes) {
      if (code === 0) {
        currentStyle = {};
      } else if (code === 1) {
        currentStyle = { ...currentStyle, bold: true };
      } else if (code === 2) {
        currentStyle = { ...currentStyle, dim: true };
      } else if (code === 3) {
        currentStyle = { ...currentStyle, italic: true };
      } else if (code === 4) {
        currentStyle = { ...currentStyle, underline: true };
      } else if (ANSI_COLORS[code]) {
        currentStyle = { ...currentStyle, color: ANSI_COLORS[code] };
      } else if (ANSI_BG_COLORS[code]) {
        currentStyle = { ...currentStyle, bgColor: ANSI_BG_COLORS[code] };
      }
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    spans.push({ text: text.slice(lastIndex), ...currentStyle });
  }

  if (spans.length === 0) {
    spans.push({ text });
  }

  return spans;
}

interface AnsiLineProps {
  text: string;
}

export function AnsiLine({ text }: AnsiLineProps) {
  const spans = parseAnsi(text);
  return (
    <>
      {spans.map((span, i) => (
        <span
          key={i}
          style={{
            color: span.color,
            backgroundColor: span.bgColor,
            fontWeight: span.bold ? 'bold' : undefined,
            fontStyle: span.italic ? 'italic' : undefined,
            textDecoration: span.underline ? 'underline' : undefined,
            opacity: span.dim ? 0.6 : undefined,
          }}
        >
          {span.text}
        </span>
      ))}
    </>
  );
}
