import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useServerStore, StoreLogEntry } from '../../stores/server-store';

const ANSI_COLORS: Record<number, string> = {
  30: '#4a4a4a', // black (brightened for dark bg)
  31: '#ef4444', // red
  32: '#22c55e', // green
  33: '#eab308', // yellow
  34: '#3b82f6', // blue
  35: '#a855f7', // magenta
  36: '#06b6d4', // cyan
  37: '#d4d4d4', // white
  90: '#737373', // bright black (gray)
  91: '#f87171', // bright red
  92: '#4ade80', // bright green
  93: '#facc15', // bright yellow
  94: '#60a5fa', // bright blue
  95: '#c084fc', // bright magenta
  96: '#22d3ee', // bright cyan
  97: '#ffffff', // bright white
};

interface AnsiSpan {
  text: string;
  color?: string;
  bold?: boolean;
}

// eslint-disable-next-line no-control-regex
const ANSI_TOKEN_RE = /\x1B\[([0-9;]*)([A-Za-z])/g;

function parseAnsi(text: string): AnsiSpan[] {
  const spans: AnsiSpan[] = [];
  let currentColor: string | undefined;
  let currentBold = false;
  let lastIndex = 0;

  for (const match of text.matchAll(ANSI_TOKEN_RE)) {
    // Push text before this escape
    if (match.index > lastIndex) {
      spans.push({
        text: text.slice(lastIndex, match.index),
        color: currentColor,
        bold: currentBold,
      });
    }
    lastIndex = match.index + match[0].length;

    // Only handle SGR sequences (ending with 'm')
    if (match[2] !== 'm') continue;

    const codes = match[1].split(';').map(Number);
    for (const code of codes) {
      if (code === 0) {
        currentColor = undefined;
        currentBold = false;
      } else if (code === 1) {
        currentBold = true;
      } else if (ANSI_COLORS[code]) {
        currentColor = ANSI_COLORS[code];
      }
    }
  }

  // Push remaining text
  if (lastIndex < text.length) {
    spans.push({ text: text.slice(lastIndex), color: currentColor, bold: currentBold });
  }

  return spans;
}

const AnsiLine = memo(function AnsiLine({ text }: { text: string }) {
  const spans = useMemo(() => parseAnsi(text), [text]);
  return (
    <>
      {spans.map((span, i) => (
        <span
          key={i}
          style={span.color ? { color: span.color } : undefined}
          className={span.bold ? 'font-bold' : undefined}
        >
          {span.text}
        </span>
      ))}
    </>
  );
});

const LogRow = memo(function LogRow({ entry }: { entry: StoreLogEntry }) {
  return (
    <div className={entry.stream === 'stderr' ? 'text-red-400' : 'text-hytale-text/80'}>
      <span className="text-hytale-muted mr-2">
        {new Date(entry.timestamp).toLocaleTimeString()}
      </span>
      <AnsiLine text={entry.line} />
    </div>
  );
});

// Threshold in pixels for determining if user is "near bottom"
const SCROLL_THRESHOLD = 50;

export default function LogPanel() {
  const { logs, clearLogs } = useServerStore();
  const [expanded, setExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Track whether user is near the bottom; start true so initial logs scroll into view
  const isNearBottom = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // User is "near bottom" if scrolled within threshold of the bottom
    isNearBottom.current = el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD;
  }, []);

  useEffect(() => {
    // Only auto-scroll if user is near the bottom
    if (scrollRef.current && isNearBottom.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-hytale-dark rounded-lg border border-hytale-accent/30 flex flex-col min-h-0 flex-1">
      <div className="flex items-center justify-between px-4 py-2 border-b border-hytale-accent/30 flex-shrink-0">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-medium text-hytale-text hover:text-white"
        >
          Server Log ({logs.length}) {expanded ? '[-]' : '[+]'}
        </button>
        <button
          onClick={clearLogs}
          className="text-xs text-hytale-muted hover:text-hytale-highlight"
        >
          Clear
        </button>
      </div>
      {expanded && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed"
        >
          {logs.length === 0 ? (
            <p className="text-hytale-muted">No log output yet.</p>
          ) : (
            logs.map((entry) => <LogRow key={entry.id} entry={entry} />)
          )}
        </div>
      )}
    </div>
  );
}
