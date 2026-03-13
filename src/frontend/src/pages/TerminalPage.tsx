import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNavigate } from "@tanstack/react-router";
import {
  Bot,
  Code,
  Download,
  FolderOpen,
  GitBranch,
  Keyboard,
  Save,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { useBridgeStatus } from "../hooks/useBridgeStatus";
import { useCommandPalette } from "../hooks/useCommandPalette";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useRepoContext } from "../hooks/useRepoContext";
import {
  useLoadTerminalSessions,
  useSaveTerminalSession,
} from "../hooks/useTerminalSessions";
import { makeOutputLine, useTerminalState } from "../hooks/useTerminalState";

import { AIAssistantPanel } from "../components/Terminal/AIAssistantPanel";
import { AIPairProgrammerPanel } from "../components/Terminal/AIPairProgrammerPanel";
import { BridgeStatusIndicator } from "../components/Terminal/BridgeStatusIndicator";
import { CommandPalette } from "../components/Terminal/CommandPalette";
import { FileBrowserPanel } from "../components/Terminal/FileBrowserPanel";
import { SessionManager } from "../components/Terminal/SessionManager";
import { TerminalSettingsMenu } from "../components/Terminal/TerminalSettings";
import { TerminalTabs } from "../components/Terminal/TerminalTabs";
import { TerminalViewport } from "../components/Terminal/TerminalViewport";

import { executeCommand, streamCommand } from "../services/bridgeApi";

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
  const isConnected = bridgeStatus === "connected";

  const [showAI, setShowAI] = useState(false);
  const [showPair, setShowPair] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [lastFailedCommand, setLastFailedCommand] = useState<{
    command: string;
    stderr: string;
    exitCode: number;
  } | null>(null);

  const { repoContext, setRepoContext, clearRepoContext } = useRepoContext();
  const [pinPopoverOpen, setPinPopoverOpen] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  const palette = useCommandPalette(
    activeTab?.commandHistory ?? [],
    activeTab?.workingDirectory ?? "~",
  );
  const abortRef = useRef<AbortController | null>(null);

  const { data: backendSessions, isFetched: sessionsFetched } =
    useLoadTerminalSessions();
  const saveSessionMutation = useSaveTerminalSession();
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      restoredRef.current = false;
      return;
    }
    if (sessionsFetched && !restoredRef.current && backendSessions) {
      restoredRef.current = true;
      loadSessionsFromBackend(backendSessions);
    }
  }, [
    isAuthenticated,
    sessionsFetched,
    backendSessions,
    loadSessionsFromBackend,
  ]);

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
          .filter((l) => l.type !== "command")
          .map((l) => l.text)
          .slice(-100),
        createdAt: now,
        lastUsedAt: now,
        lastSavedAt: now,
      };
      saveSessionMutation.mutate(session);
    }, 1500);
  }, [isAuthenticated, activeTab, identity, saveSessionMutation]);

  const handlePinRepo = useCallback(async () => {
    const trimmed = pinInput.trim();
    if (!trimmed || !trimmed.includes("/")) return;
    const [owner, name] = trimmed.split("/");
    if (!owner || !name) return;
    setPinLoading(true);
    try {
      const pat = localStorage.getItem("githubPAT");
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
      };
      if (pat) headers.Authorization = `Bearer ${pat}`;
      const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setRepoContext({
          owner,
          name,
          fullName: `${owner}/${name}`,
          language: data.language ?? "",
          topics: data.topics ?? [],
        });
      } else {
        setRepoContext({
          owner,
          name,
          fullName: `${owner}/${name}`,
          language: "",
          topics: [],
        });
      }
    } catch {
      setRepoContext({
        owner,
        name,
        fullName: `${owner}/${name}`,
        language: "",
        topics: [],
      });
    } finally {
      setPinLoading(false);
      setPinPopoverOpen(false);
      setPinInput("");
    }
  }, [pinInput, setRepoContext]);

  const runCommand = useCallback(
    async (command: string) => {
      if (!activeTab) return;
      const tabId = activeTab.id;
      if (command === "clear") {
        clearOutput(tabId);
        return;
      }
      addToHistory(tabId, command);
      appendOutput(tabId, makeOutputLine(command, "command"));
      if (!isConnected) {
        appendOutput(
          tabId,
          makeOutputLine(
            "Error: Bridge not connected. Visit /bridge-setup to install the local bridge.",
            "error",
          ),
        );
        autoSaveSession();
        return;
      }
      setTabRunning(tabId, true);
      setLastFailedCommand(null);
      try {
        abortRef.current = new AbortController();
        const longRunning =
          /^(npm|yarn|pnpm|pip|cargo|make|docker|kubectl|watch|tail|ping|top|htop|python|node|ruby|go run)/i.test(
            command,
          );
        if (longRunning) {
          await streamCommand(
            command,
            (line) => appendOutput(tabId, makeOutputLine(line, "output")),
            (exitCode) => {
              setTabRunning(tabId, false);
              if (exitCode !== 0)
                appendOutput(
                  tabId,
                  makeOutputLine(
                    `Process exited with code ${exitCode}`,
                    "error",
                  ),
                );
              autoSaveSession();
            },
            abortRef.current.signal,
          );
        } else {
          const result = await executeCommand(command);
          if (result.stdout) {
            for (const line of result.stdout.split("\n")) {
              if (line) appendOutput(tabId, makeOutputLine(line, "output"));
            }
          }
          if (result.stderr) {
            for (const line of result.stderr.split("\n")) {
              if (line) appendOutput(tabId, makeOutputLine(line, "error"));
            }
          }
          if (result.exitCode !== 0) {
            setLastFailedCommand({
              command,
              stderr: result.stderr,
              exitCode: result.exitCode,
            });
          }
          if (command.startsWith("cd ") && result.exitCode === 0) {
            setWorkingDirectory(tabId, command.slice(3).trim() || "~");
          }
          autoSaveSession();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        appendOutput(tabId, makeOutputLine(`Error: ${msg}`, "error"));
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
    ],
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
                (e.target as HTMLImageElement).style.display = "none";
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
              className={`h-7 gap-1.5 text-xs font-mono ${showFiles ? "text-yellow-400 bg-yellow-400/10" : "text-white/50 hover:text-white hover:bg-white/10"}`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Files</span>
            </Button>

            <Popover open={pinPopoverOpen} onOpenChange={setPinPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  data-ocid="terminal.pin_repo.button"
                  className={`h-7 gap-1.5 text-xs font-mono relative ${repoContext ? "text-neon-green bg-neon-green/10" : "text-white/50 hover:text-white hover:bg-white/10"}`}
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pin Repo</span>
                  {repoContext && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-green-400" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                data-ocid="terminal.pin_repo.popover"
                className="w-64 bg-[#0d1117] border border-white/10 p-3"
                align="end"
              >
                <p className="text-[11px] font-mono text-white/60 mb-2">
                  Pin a repo for context-aware AI suggestions
                </p>
                <div className="flex gap-1">
                  <Input
                    data-ocid="terminal.pin_repo.input"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePinRepo()}
                    placeholder="owner/repo"
                    className="h-7 text-[11px] font-mono bg-black/30 border-white/10 text-white/80 placeholder-white/20"
                  />
                  <Button
                    size="sm"
                    data-ocid="terminal.pin_repo.confirm.button"
                    onClick={handlePinRepo}
                    disabled={pinLoading || !pinInput.trim().includes("/")}
                    className="h-7 px-2 bg-neon-green/10 hover:bg-neon-green/20 border border-neon-green/30 text-neon-green text-[11px]"
                  >
                    {pinLoading ? (
                      <span className="w-3 h-3 border border-neon-green border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "Pin"
                    )}
                  </Button>
                </div>
                {repoContext && (
                  <button
                    type="button"
                    onClick={() => {
                      clearRepoContext();
                      setPinPopoverOpen(false);
                    }}
                    className="mt-2 text-[10px] font-mono text-white/30 hover:text-red-400 transition-colors"
                  >
                    Unpin current: {repoContext.fullName}
                  </button>
                )}
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAI(!showAI);
                if (showPair) setShowPair(false);
              }}
              className={`h-7 gap-1.5 text-xs font-mono relative ${showAI ? "text-neon-green bg-neon-green/10" : "text-white/50 hover:text-white hover:bg-white/10"}`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI</span>
              {repoContext && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-green-400" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowPair(!showPair);
                if (showAI) setShowAI(false);
              }}
              className={`h-7 gap-1.5 text-xs font-mono ${showPair ? "text-blue-400 bg-blue-400/10" : "text-white/50 hover:text-white hover:bg-white/10"}`}
            >
              <Code className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pair</span>
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
              onClick={() => navigate({ to: "/bridge-setup" })}
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
            <TerminalSettingsMenu
              settings={settings}
              onUpdate={updateSettings}
            />
            <BridgeStatusIndicator
              status={bridgeStatus}
              lastChecked={lastChecked}
            />
          </div>
        </div>

        <TerminalTabs
          tabs={tabs}
          activeTabIndex={activeTabIndex}
          onSwitch={switchTab}
          onAdd={() => addTab()}
          onClose={closeTab}
          onRename={renameTab}
        />

        <div className="flex flex-1 overflow-hidden">
          {showFiles && (
            <FileBrowserPanel
              bridgeConnected={isConnected}
              onClose={() => setShowFiles(false)}
              onOpenInTerminal={handleOpenInTerminal}
            />
          )}

          {activeTab && (
            <TerminalViewport
              tab={activeTab}
              settings={settings}
              onCommand={runCommand}
              onOpenPalette={palette.open}
              isConnected={isConnected}
            />
          )}

          {showAI && (
            <AIAssistantPanel
              isOpen={showAI}
              onClose={() => setShowAI(false)}
              onRunCommand={runCommand}
              lastFailedCommand={lastFailedCommand}
              commandHistory={activeTab?.commandHistory ?? []}
              repoContext={repoContext}
              onUnpinRepo={clearRepoContext}
            />
          )}

          {showPair && (
            <AIPairProgrammerPanel
              isOpen={showPair}
              onClose={() => setShowPair(false)}
              onRunCommand={runCommand}
              repoContext={repoContext}
            />
          )}
        </div>

        {activeTab && (
          <SessionManager
            open={showSessions}
            onClose={() => setShowSessions(false)}
            activeTab={activeTab}
            onRestoreSession={restoreSession}
          />
        )}

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
