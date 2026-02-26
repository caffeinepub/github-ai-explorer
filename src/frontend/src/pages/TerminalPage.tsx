import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Bot, FolderOpen, Save, Download, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { useTerminalState, makeOutputLine } from '../hooks/useTerminalState';
import { useBridgeStatus } from '../hooks/useBridgeStatus';
import { useCommandPalette } from '../hooks/useCommandPalette';
import {
  useLoadTerminalSessions,
  useSaveTerminalSession,
} from '../hooks/useTerminalSessions';
import { useInternetIdentity } from '../hooks/useInternetIdentity';

import { TerminalTabs } from '../components/Terminal/TerminalTabs';
import { TerminalViewport } from '../components/Terminal/TerminalViewport';
import { TerminalSettingsMenu } from '../components/Terminal/TerminalSettings';
import { BridgeStatusIndicator } from '../components/Terminal/BridgeStatusIndicator';
import { AIAssistantPanel } from '../components/Terminal/AIAssistantPanel';
import { FileBrowserPanel } from '../components/Terminal/FileBrowserPanel';
import { SessionManager } from '../components/Terminal/SessionManager';
import { CommandPalette } from '../components/Terminal/CommandPalette';

import { streamCommand, executeCommand } from '../services/bridgeApi';

export default function TerminalPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const {
    tabs,
    activeTabIndex,
    activeTab,
    settings,
    addTab,
    closeTab,
    renameTab,
    switchTab,
    appendOutput,
    clearOutput,
    addToHistory,
    setWorkingDirectory,
    setTabRunning,
    updateSettings,
    restoreSession,
    loadSessionsFromBackend,
  } = useTerminalState();

  const { status: bridgeStatus, lastChecked } = useBridgeStatus();
  const isConnected = bridgeStatus === 'connected';

  const [showAI, setShowAI] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [lastFailedCommand, setLastFailedCommand] = useState<{
    command: string;
    stderr: string;
    exitCode: number;
  } | null>(null);

  const palette = useCommandPalette(activeTab?.commandHistory ?? [], activeTab?.workingDirectory ?? '~');
  const abortRef = useRef<AbortController | null>(null);

  // ── Backend session persistence ──────────────────────────────────────────
  const { data: backendSessions, isFetched: sessionsFetched } = useLoadTerminalSessions();
  const saveSessionMutation = useSaveTerminalSession();
  const restoredRef = useRef(false);

  // Auto-restore sessions once after login
  useEffect(() => {
    if (!isAuthenticated) {
      restoredRef.current = false;
      return;
    }
    if (sessionsFetched && !restoredRef.current && backendSessions) {
      restoredRef.current = true;
      loadSessionsFromBackend(backendSessions);
    }
  }, [isAuthenticated, sessionsFetched, backendSessions, loadSessionsFromBackend]);

  // Auto-save active tab to backend after each command (debounced)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveSession = useCallback(() => {
    if (!isAuthenticated || !activeTab) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      const now = BigInt(Date.now()) * BigInt(1_000_000);
      const session = {
        id: activeTab.id,
        name: activeTab.name,
        userId: identity!.getPrincipal(),
        commandHistory: activeTab.commandHistory,
        workingDirectory: activeTab.workingDirectory,
        outputHistory: activeTab.outputBuffer
          .filter((l) => l.type !== 'command')
          .map((l) => l.text)
          .slice(-100),
        createdAt: now,
        lastUsedAt: now,
        lastSavedAt: now,
      };
      saveSessionMutation.mutate(session);
    }, 1500);
  }, [isAuthenticated, activeTab, identity, saveSessionMutation]);

  // ── Command runner ───────────────────────────────────────────────────────
  const runCommand = useCallback(
    async (command: string) => {
      if (!activeTab) return;
      const tabId = activeTab.id;

      // Handle built-in commands
      if (command === 'clear') {
        clearOutput(tabId);
        return;
      }

      addToHistory(tabId, command);
      appendOutput(tabId, makeOutputLine(command, 'command'));

      if (!isConnected) {
        appendOutput(
          tabId,
          makeOutputLine(
            'Error: Bridge not connected. Visit /bridge-setup to install the local bridge.',
            'error'
          )
        );
        // Still auto-save even when bridge is not connected
        autoSaveSession();
        return;
      }

      setTabRunning(tabId, true);
      setLastFailedCommand(null);

      try {
        abortRef.current = new AbortController();

        // Use streaming for long-running commands
        const longRunning =
          /^(npm|yarn|pnpm|pip|cargo|make|docker|kubectl|watch|tail|ping|top|htop|python|node|ruby|go run)/i.test(
            command
          );

        if (longRunning) {
          await streamCommand(
            command,
            (line) => appendOutput(tabId, makeOutputLine(line, 'output')),
            (exitCode) => {
              setTabRunning(tabId, false);
              if (exitCode !== 0) {
                appendOutput(
                  tabId,
                  makeOutputLine(`Process exited with code ${exitCode}`, 'error')
                );
              }
              autoSaveSession();
            },
            abortRef.current.signal
          );
        } else {
          const result = await executeCommand(command);

          if (result.stdout) {
            result.stdout.split('\n').forEach((line) => {
              if (line) appendOutput(tabId, makeOutputLine(line, 'output'));
            });
          }
          if (result.stderr) {
            result.stderr.split('\n').forEach((line) => {
              if (line) appendOutput(tabId, makeOutputLine(line, 'error'));
            });
          }

          if (result.exitCode !== 0) {
            setLastFailedCommand({ command, stderr: result.stderr, exitCode: result.exitCode });
          }

          // Update working directory if cd command
          if (command.startsWith('cd ') && result.exitCode === 0) {
            const newDir = command.slice(3).trim();
            setWorkingDirectory(tabId, newDir || '~');
          }

          autoSaveSession();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        appendOutput(tabId, makeOutputLine(`Error: ${msg}`, 'error'));
        autoSaveSession();
      } finally {
        setTabRunning(tabId, false);
      }
    },
    [
      activeTab,
      isConnected,
      addToHistory,
      appendOutput,
      clearOutput,
      setTabRunning,
      setWorkingDirectory,
      autoSaveSession,
    ]
  );

  const handlePaletteSelect = (command: string) => {
    palette.close();
    runCommand(command);
  };

  const handleOpenInTerminal = (path: string) => {
    runCommand(`cd ${path}`);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#0d1117] text-white overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-black/40 shrink-0">
          <div className="flex items-center gap-1">
            <img
              src="/assets/generated/terminal-logo.dim_128x128.png"
              alt="Terminal"
              className="w-5 h-5 rounded opacity-80"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="text-xs font-mono font-semibold text-white/60 hidden sm:inline">
              WebTerminal
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFiles(!showFiles)}
              className={`h-7 gap-1.5 text-xs font-mono ${
                showFiles
                  ? 'text-yellow-400 bg-yellow-400/10'
                  : 'text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Files</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAI(!showAI)}
              className={`h-7 gap-1.5 text-xs font-mono ${
                showAI
                  ? 'text-neon-green bg-neon-green/10'
                  : 'text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSessions(true)}
              className="h-7 gap-1.5 text-xs font-mono text-white/50 hover:text-white hover:bg-white/10"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sessions</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/bridge-setup' })}
              className="h-7 gap-1.5 text-xs font-mono text-white/50 hover:text-white hover:bg-white/10"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bridge</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={palette.open}
              className="h-7 gap-1.5 text-xs font-mono text-white/50 hover:text-white hover:bg-white/10"
              title="Command Palette (Ctrl+K)"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Palette</span>
              <kbd className="hidden lg:inline text-[9px] border border-white/10 rounded px-1 ml-1">
                ⌘K
              </kbd>
            </Button>
            <TerminalSettingsMenu settings={settings} onUpdate={updateSettings} />
            <BridgeStatusIndicator status={bridgeStatus} lastChecked={lastChecked} />
          </div>
        </div>

        {/* Tabs */}
        <TerminalTabs
          tabs={tabs}
          activeTabIndex={activeTabIndex}
          onSwitch={switchTab}
          onAdd={() => addTab()}
          onClose={closeTab}
          onRename={renameTab}
        />

        {/* Main area */}
        <div className="flex flex-1 overflow-hidden">
          {/* File browser */}
          {showFiles && (
            <FileBrowserPanel
              bridgeConnected={isConnected}
              onClose={() => setShowFiles(false)}
              onOpenInTerminal={handleOpenInTerminal}
            />
          )}

          {/* Terminal viewport */}
          {activeTab && (
            <TerminalViewport
              tab={activeTab}
              settings={settings}
              onCommand={runCommand}
              onOpenPalette={palette.open}
              isConnected={isConnected}
            />
          )}

          {/* AI panel */}
          {showAI && (
            <AIAssistantPanel
              isOpen={showAI}
              onClose={() => setShowAI(false)}
              onRunCommand={runCommand}
              lastFailedCommand={lastFailedCommand}
              commandHistory={activeTab?.commandHistory ?? []}
            />
          )}
        </div>

        {/* Session manager dialog */}
        {activeTab && (
          <SessionManager
            open={showSessions}
            onClose={() => setShowSessions(false)}
            activeTab={activeTab}
            onRestoreSession={restoreSession}
          />
        )}

        {/* Command palette */}
        <CommandPalette
          isOpen={palette.isOpen}
          query={palette.query}
          commands={palette.filtered}
          onClose={palette.close}
          onSelect={handlePaletteSelect}
          onQueryChange={palette.setQuery}
        />
      </div>
    </TooltipProvider>
  );
}
