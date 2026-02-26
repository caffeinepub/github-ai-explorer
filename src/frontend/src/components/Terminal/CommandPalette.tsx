import React, { useEffect, useRef } from 'react';
import { Search, Clock, Zap, Star, ArrowRight } from 'lucide-react';
import type { PaletteCommand } from '../../hooks/useCommandPalette';

interface CommandPaletteProps {
  isOpen: boolean;
  query: string;
  commands: PaletteCommand[];
  onClose: () => void;
  onSelect: (command: string) => void;
  onQueryChange: (q: string) => void;
}

const SOURCE_ICONS: Record<PaletteCommand['source'], React.ReactNode> = {
  history: <Clock className="w-3 h-3 text-white/30" />,
  ai: <Zap className="w-3 h-3 text-neon-green/60" />,
  common: <Star className="w-3 h-3 text-yellow-400/50" />,
};

export function CommandPalette({
  isOpen,
  query,
  commands,
  onClose,
  onSelect,
  onQueryChange,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, commands.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (commands[selectedIndex]) onSelect(commands[selectedIndex].text);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, commands, selectedIndex, onClose, onSelect]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0d1117] border border-white/10 rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/10">
          <Search className="w-4 h-4 text-white/30 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-sm font-mono text-white/80 placeholder-white/20 outline-none"
          />
          <kbd className="text-[10px] font-mono text-white/20 border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Command list */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {commands.length === 0 ? (
            <div className="text-center py-8 text-xs font-mono text-white/25">No commands found</div>
          ) : (
            commands.map((cmd, i) => (
              <button
                key={i}
                onClick={() => onSelect(cmd.text)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  i === selectedIndex ? 'bg-neon-green/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                }`}
              >
                {SOURCE_ICONS[cmd.source]}
                <div className="flex-1 min-w-0">
                  <code className="text-xs text-yellow-300/80 block truncate">{cmd.text}</code>
                  <span className="text-[10px] text-white/30 truncate">{cmd.description}</span>
                </div>
                {i === selectedIndex && <ArrowRight className="w-3.5 h-3.5 text-neon-green/60 shrink-0" />}
              </button>
            ))
          )}
        </div>

        <div className="px-3 py-1.5 border-t border-white/5 flex items-center gap-3 text-[10px] font-mono text-white/20">
          <span><kbd className="border border-white/10 rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="border border-white/10 rounded px-1">↵</kbd> select</span>
          <span><kbd className="border border-white/10 rounded px-1">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
