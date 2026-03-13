import { useMemo } from "react";
import { useLoadTerminalSessions } from "./useTerminalSessions";

export function useWorkflowHistory() {
  const { data: sessions } = useLoadTerminalSessions();

  const { topCommands, recentCommands } = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return { topCommands: [], recentCommands: [] };
    }

    const freqMap = new Map<string, number>();
    const allCommands: string[] = [];

    for (const session of sessions) {
      for (const cmd of session.commandHistory) {
        allCommands.push(cmd);
        freqMap.set(cmd, (freqMap.get(cmd) ?? 0) + 1);
      }
    }

    // Top commands by frequency
    const sorted = [...freqMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cmd]) => cmd);

    // Recent unique commands (last 20)
    const seen = new Set<string>();
    const recent: string[] = [];
    for (let i = allCommands.length - 1; i >= 0 && recent.length < 20; i--) {
      const cmd = allCommands[i];
      if (!seen.has(cmd)) {
        seen.add(cmd);
        recent.push(cmd);
      }
    }

    return { topCommands: sorted, recentCommands: recent };
  }, [sessions]);

  function getTopCommands(n: number): string[] {
    return topCommands.slice(0, n);
  }

  return { getTopCommands, recentCommands };
}
