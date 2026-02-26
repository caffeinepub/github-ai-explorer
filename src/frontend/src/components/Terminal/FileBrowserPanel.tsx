import React from 'react';
import {
  Folder,
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  Copy,
  Terminal,
  RefreshCw,
  ArrowUp,
  X,
  Loader2,
} from 'lucide-react';
import { useFileBrowser } from '../../hooks/useFileBrowser';
import { Button } from '@/components/ui/button';
import type { FileEntry } from '../../services/bridgeApi';

interface FileBrowserPanelProps {
  bridgeConnected: boolean;
  onClose: () => void;
  onOpenInTerminal: (path: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}

function FileRow({
  entry,
  isExpanded,
  onToggle,
  onCopy,
  onOpenInTerminal,
}: {
  entry: FileEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onCopy: () => void;
  onOpenInTerminal: () => void;
}) {
  const isDir = entry.type === 'directory';
  return (
    <div className="group flex items-center gap-1 px-2 py-0.5 hover:bg-white/5 rounded cursor-pointer text-[11px] font-mono">
      <button
        onClick={isDir ? onToggle : undefined}
        className="flex items-center gap-1 flex-1 min-w-0 text-left"
      >
        {isDir ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-white/30 shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-white/30 shrink-0" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            )}
          </>
        ) : (
          <>
            <span className="w-3 h-3 shrink-0" />
            <File className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          </>
        )}
        <span className="truncate text-white/70 ml-1">{entry.name}</span>
        {!isDir && (
          <span className="ml-auto text-white/25 shrink-0 pl-1">{formatSize(entry.size)}</span>
        )}
      </button>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onCopy}
          title="Copy path"
          className="p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-white/70"
        >
          <Copy className="w-2.5 h-2.5" />
        </button>
        {isDir && (
          <button
            onClick={onOpenInTerminal}
            title="Open in terminal"
            className="p-0.5 rounded hover:bg-white/10 text-neon-green/60 hover:text-neon-green"
          >
            <Terminal className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function FileBrowserPanel({ bridgeConnected, onClose, onOpenInTerminal }: FileBrowserPanelProps) {
  const { currentPath, entries, isLoading, error, expandedPaths, navigate, toggleExpand, copyPath, goUp, refresh } =
    useFileBrowser(bridgeConnected);

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border-r border-white/10 w-64 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-2 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-1.5">
          <Folder className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-[11px] font-mono text-white/70 font-semibold">Files</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10"
            onClick={goUp}
            title="Go up"
          >
            <ArrowUp className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10"
            onClick={() => refresh()}
            title="Refresh"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10"
            onClick={onClose}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Path breadcrumb */}
      <div className="px-2 py-1 border-b border-white/5 bg-black/10">
        <span className="text-[10px] font-mono text-white/30 truncate block">{currentPath}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-1">
        {!bridgeConnected ? (
          <div className="text-center py-8 px-3">
            <Folder className="w-8 h-8 mx-auto mb-2 text-white/10" />
            <p className="text-[10px] font-mono text-white/25">Bridge not connected</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8 px-3">
            <p className="text-[10px] font-mono text-red-400/60">Failed to load directory</p>
            <button
              onClick={() => refresh()}
              className="mt-2 text-[10px] font-mono text-neon-green/60 hover:text-neon-green"
            >
              Retry
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[10px] font-mono text-white/25">Empty directory</p>
          </div>
        ) : (
          entries.map((entry) => (
            <FileRow
              key={entry.path}
              entry={entry}
              isExpanded={expandedPaths.has(entry.path)}
              onToggle={() => {
                toggleExpand(entry.path);
                if (entry.type === 'directory') navigate(entry.path);
              }}
              onCopy={() => copyPath(entry.path)}
              onOpenInTerminal={() => onOpenInTerminal(entry.path)}
            />
          ))
        )}
      </div>
    </div>
  );
}
