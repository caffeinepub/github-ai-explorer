import { useState, useCallback, useEffect } from 'react';
import type { TerminalSession } from '../backend';

export type TerminalTheme = 'dark' | 'light' | 'solarized';
export type FontSize = 'sm' | 'md' | 'lg';

export interface OutputLine {
  id: string;
  text: string;
  type: 'output' | 'error' | 'info' | 'command' | 'ai';
  timestamp: number;
}

export interface TerminalTab {
  id: string;
  name: string;
  commandHistory: string[];
  outputBuffer: OutputLine[];
  workingDirectory: string;
  isRunning: boolean;
}

export interface TerminalSettings {
  theme: TerminalTheme;
  fontSize: FontSize;
  showTimestamps: boolean;
}

let lineCounter = 0;
export function makeOutputLine(text: string, type: OutputLine['type'] = 'output'): OutputLine {
  return { id: `line-${++lineCounter}-${Date.now()}`, text, type, timestamp: Date.now() };
}

function createTab(name?: string): TerminalTab {
  return {
    id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name || 'Terminal',
    commandHistory: [],
    outputBuffer: [makeOutputLine('Welcome to WebTerminal. Connect the local bridge to execute real commands.', 'info')],
    workingDirectory: '~',
    isRunning: false,
  };
}

const STORAGE_KEY = 'terminal-state';

function loadFromStorage(): { tabs: TerminalTab[]; activeTabIndex: number; settings: TerminalSettings } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToStorage(tabs: TerminalTab[], activeTabIndex: number, settings: TerminalSettings) {
  try {
    // Only persist history and settings, not full output buffers (keep last 50 lines)
    const toSave = {
      tabs: tabs.map((t) => ({ ...t, outputBuffer: t.outputBuffer.slice(-50) })),
      activeTabIndex,
      settings,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // ignore storage errors
  }
}

/** Convert a backend TerminalSession into a TerminalTab for display */
export function sessionToTab(session: TerminalSession): TerminalTab {
  const outputLines: OutputLine[] = session.outputHistory.map((line, i) => ({
    id: `restored-${session.id}-${i}`,
    text: line,
    type: 'output' as const,
    timestamp: Number(session.lastUsedAt) / 1_000_000,
  }));

  return {
    id: session.id,
    name: session.name,
    commandHistory: session.commandHistory,
    outputBuffer: [
      makeOutputLine(`Session "${session.name}" restored. Working directory: ${session.workingDirectory}`, 'info'),
      ...outputLines,
    ],
    workingDirectory: session.workingDirectory,
    isRunning: false,
  };
}

export function useTerminalState() {
  const stored = loadFromStorage();

  const [tabs, setTabs] = useState<TerminalTab[]>(
    stored?.tabs?.length ? stored.tabs : [createTab()]
  );
  const [activeTabIndex, setActiveTabIndex] = useState<number>(stored?.activeTabIndex ?? 0);
  const [settings, setSettings] = useState<TerminalSettings>(
    stored?.settings ?? { theme: 'dark', fontSize: 'md', showTimestamps: false }
  );
  // Track whether backend sessions have been loaded to avoid double-restore
  const [backendSessionsLoaded, setBackendSessionsLoaded] = useState(false);

  // Persist on changes
  useEffect(() => {
    saveToStorage(tabs, activeTabIndex, settings);
  }, [tabs, activeTabIndex, settings]);

  const activeTab = tabs[activeTabIndex] ?? tabs[0];

  const addTab = useCallback((name?: string) => {
    const newTab = createTab(name);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabIndex((prev) => prev + 1);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => {
      if (prev.length === 1) return prev; // keep at least one
      const idx = prev.findIndex((t) => t.id === tabId);
      const next = prev.filter((t) => t.id !== tabId);
      setActiveTabIndex((ai) => {
        if (ai >= next.length) return next.length - 1;
        if (ai > idx) return ai - 1;
        return ai;
      });
      return next;
    });
  }, []);

  const renameTab = useCallback((tabId: string, name: string) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, name } : t)));
  }, []);

  const switchTab = useCallback((index: number) => {
    setActiveTabIndex(index);
  }, []);

  const appendOutput = useCallback((tabId: string, line: OutputLine) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId ? { ...t, outputBuffer: [...t.outputBuffer, line] } : t
      )
    );
  }, []);

  const clearOutput = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId
          ? { ...t, outputBuffer: [makeOutputLine('Screen cleared.', 'info')] }
          : t
      )
    );
  }, []);

  const addToHistory = useCallback((tabId: string, command: string) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId) return t;
        const history = t.commandHistory.filter((c) => c !== command);
        return { ...t, commandHistory: [...history, command].slice(-200) };
      })
    );
  }, []);

  const setWorkingDirectory = useCallback((tabId: string, dir: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, workingDirectory: dir } : t))
    );
  }, []);

  const setTabRunning = useCallback((tabId: string, running: boolean) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, isRunning: running } : t))
    );
  }, []);

  const updateSettings = useCallback((partial: Partial<TerminalSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const restoreSession = useCallback(
    (sessionData: { name: string; commandHistory: string[]; workingDirectory: string }) => {
      const newTab: TerminalTab = {
        id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: sessionData.name,
        commandHistory: sessionData.commandHistory,
        outputBuffer: [
          makeOutputLine(`Session "${sessionData.name}" restored. Working directory: ${sessionData.workingDirectory}`, 'info'),
        ],
        workingDirectory: sessionData.workingDirectory,
        isRunning: false,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabIndex((prev) => prev + 1);
    },
    []
  );

  /**
   * Load sessions from the backend and replace the current tabs.
   * If sessions is empty, keep the default tab.
   */
  const loadSessionsFromBackend = useCallback((sessions: TerminalSession[]) => {
    if (backendSessionsLoaded) return;
    setBackendSessionsLoaded(true);

    if (sessions.length === 0) return;

    const restoredTabs = sessions.map(sessionToTab);
    setTabs(restoredTabs);
    setActiveTabIndex(0);
  }, [backendSessionsLoaded]);

  return {
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
  };
}
