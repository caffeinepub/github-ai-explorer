import React, { useState, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import type { TerminalTab } from '../../hooks/useTerminalState';

interface TerminalTabsProps {
  tabs: TerminalTab[];
  activeTabIndex: number;
  onSwitch: (index: number) => void;
  onAdd: () => void;
  onClose: (tabId: string) => void;
  onRename: (tabId: string, name: string) => void;
}

export function TerminalTabs({
  tabs,
  activeTabIndex,
  onSwitch,
  onAdd,
  onClose,
  onRename,
}: TerminalTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (tab: TerminalTab) => {
    setEditingId(tab.id);
    setEditValue(tab.name);
    setTimeout(() => inputRef.current?.select(), 50);
  };

  const commitEdit = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none border-b border-white/10 bg-black/30 px-2 pt-1">
      {tabs.map((tab, index) => {
        const isActive = index === activeTabIndex;
        return (
          <div
            key={tab.id}
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs font-mono cursor-pointer select-none transition-colors min-w-0 max-w-[160px] shrink-0 ${
              isActive
                ? 'bg-terminal-surface text-neon-green border-t border-x border-neon-green/30'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            }`}
            onClick={() => onSwitch(index)}
            onDoubleClick={() => startEdit(tab)}
          >
            {tab.isRunning && (
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse shrink-0" />
            )}
            {editingId === tab.id ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditingId(null);
                  e.stopPropagation();
                }}
                className="bg-transparent outline-none w-full min-w-0 text-neon-green"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate">{tab.name}</span>
            )}
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity shrink-0 ml-auto"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
      <button
        onClick={onAdd}
        className="flex items-center justify-center w-7 h-7 rounded text-white/40 hover:text-neon-green hover:bg-white/5 transition-colors shrink-0 ml-1"
        title="New tab"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
