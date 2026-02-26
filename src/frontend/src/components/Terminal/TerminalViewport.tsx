import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AnsiLine } from './AnsiParser';
import { useCommandHistory } from '../../hooks/useCommandHistory';
import { useAIAutoComplete } from '../../hooks/useAIAutoComplete';
import type { OutputLine, TerminalTab, TerminalSettings } from '../../hooks/useTerminalState';

const THEME_STYLES = {
  dark: {
    bg: 'bg-[#0d1117]',
    text: 'text-[#f8f8f2]',
    prompt: 'text-[#50fa7b]',
    cursor: 'bg-[#50fa7b]',
    selection: 'selection:bg-[#50fa7b]/20',
  },
  light: {
    bg: 'bg-[#fafafa]',
    text: 'text-[#383a42]',
    prompt: 'text-[#0184bc]',
    cursor: 'bg-[#0184bc]',
    selection: 'selection:bg-[#0184bc]/20',
  },
  solarized: {
    bg: 'bg-[#002b36]',
    text: 'text-[#839496]',
    prompt: 'text-[#859900]',
    cursor: 'bg-[#859900]',
    selection: 'selection:bg-[#859900]/20',
  },
};

const FONT_SIZE_MAP: Record<string, string> = {
  sm: 'text-[12px]',
  md: 'text-[14px]',
  lg: 'text-[16px]',
};

const OUTPUT_TYPE_STYLES: Record<OutputLine['type'], string> = {
  output: '',
  error: 'text-[#ff5555]',
  info: 'text-[#6272a4]',
  command: 'text-[#f1fa8c]',
  ai: 'text-[#ff79c6]',
};

interface TerminalViewportProps {
  tab: TerminalTab;
  settings: TerminalSettings;
  onCommand: (command: string) => void;
  onOpenPalette: () => void;
  isConnected: boolean;
}

export function TerminalViewport({ tab, settings, onCommand, onOpenPalette, isConnected }: TerminalViewportProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { navigateUp, navigateDown, resetPosition } = useCommandHistory(tab.commandHistory);
  const ghostText = useAIAutoComplete(input, tab.commandHistory);
  const theme = THEME_STYLES[settings.theme];
  const fontSize = FONT_SIZE_MAP[settings.fontSize] || FONT_SIZE_MAP.md;

  // Auto-scroll to bottom on new output
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tab.outputBuffer]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = input.trim();
        if (cmd) {
          onCommand(cmd);
          setInput('');
          resetPosition();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = navigateUp();
        if (prev !== null) setInput(prev);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = navigateDown();
        if (next !== null) setInput(next);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (ghostText) setInput(input + ghostText);
      } else if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onOpenPalette();
      } else if (e.key === 'c' && e.ctrlKey && !input) {
        setInput('');
      }
    },
    [input, ghostText, navigateUp, navigateDown, resetPosition, onCommand, onOpenPalette]
  );

  const focusInput = () => inputRef.current?.focus();

  return (
    <div
      className={`flex-1 flex flex-col overflow-hidden ${theme.bg} ${theme.text} ${fontSize} font-mono cursor-text`}
      onClick={focusInput}
    >
      {/* Output area */}
      <div className={`flex-1 overflow-y-auto p-3 space-y-0.5 ${theme.selection}`}>
        {tab.outputBuffer.map((line) => (
          <div
            key={line.id}
            className={`leading-relaxed whitespace-pre-wrap break-all ${OUTPUT_TYPE_STYLES[line.type]}`}
          >
            {settings.showTimestamps && (
              <span className="text-white/20 mr-2 text-[10px]">
                {new Date(line.timestamp).toLocaleTimeString()}
              </span>
            )}
            {line.type === 'command' ? (
              <span>
                <span className={theme.prompt}>$ </span>
                <AnsiLine text={line.text} />
              </span>
            ) : (
              <AnsiLine text={line.text} />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className={`flex items-center gap-0 px-3 py-2 border-t border-white/5 ${tab.isRunning ? 'opacity-50' : ''}`}>
        <span className={`${theme.prompt} mr-2 shrink-0`}>
          {tab.workingDirectory}$
        </span>
        <div className="relative flex-1 flex items-center">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={tab.isRunning}
            className="w-full bg-transparent outline-none caret-transparent"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Terminal input"
          />
          {/* Ghost text overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center">
            <span className="invisible">{input}</span>
            {ghostText && (
              <span className="text-white/20">{ghostText}</span>
            )}
          </div>
          {/* Cursor */}
          {isFocused && !tab.isRunning && (
            <span
              className={`absolute ${theme.cursor} w-[2px] h-[1.1em] animate-pulse`}
              style={{ left: `${input.length}ch` }}
            />
          )}
        </div>
        {tab.isRunning && (
          <span className="text-yellow-400 text-[10px] ml-2 animate-pulse shrink-0">running...</span>
        )}
      </div>

      {/* Keyboard hint */}
      {!isConnected && (
        <div className="px-3 py-1 bg-yellow-500/10 border-t border-yellow-500/20 text-[10px] text-yellow-400/70 font-mono">
          ⚠ Bridge not connected — commands won't execute. <span className="underline cursor-pointer">Set up bridge →</span>
        </div>
      )}
    </div>
  );
}
