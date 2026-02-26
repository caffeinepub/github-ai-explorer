import { useState, useCallback, useMemo } from 'react';
import { fuzzySearch } from '../utils/fuzzySearch';
import { COMMON_COMMANDS, generateCommandSuggestions, type CommandSuggestion } from '../utils/aiCommandRules';

export interface PaletteCommand {
  text: string;
  description: string;
  source: 'history' | 'ai' | 'common';
}

export function useCommandPalette(history: string[], workingDirectory: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  const allCommands = useMemo<PaletteCommand[]>(() => {
    const cmds: PaletteCommand[] = [];

    // Recent history (last 20, deduplicated)
    const seen = new Set<string>();
    for (const h of [...history].reverse().slice(0, 20)) {
      if (!seen.has(h)) {
        seen.add(h);
        cmds.push({ text: h, description: 'Recent command', source: 'history' });
      }
    }

    // AI suggestions based on working directory context
    const contextInput =
      workingDirectory.includes('node_modules') || workingDirectory.includes('package')
        ? 'npm install run'
        : workingDirectory.includes('.git') || workingDirectory.includes('git')
        ? 'git status commit push'
        : 'list files';
    const aiSuggestions: CommandSuggestion[] = generateCommandSuggestions(contextInput);
    for (const s of aiSuggestions) {
      if (!seen.has(s.command)) {
        seen.add(s.command);
        cmds.push({ text: s.command, description: s.description, source: 'ai' });
      }
    }

    // Common commands
    for (const c of COMMON_COMMANDS) {
      if (!seen.has(c.command)) {
        seen.add(c.command);
        cmds.push({ text: c.command, description: c.description, source: 'common' });
      }
    }

    return cmds;
  }, [history, workingDirectory]);

  const filtered = useMemo<PaletteCommand[]>(() => {
    if (!query.trim()) return allCommands.slice(0, 20);
    return fuzzySearch<PaletteCommand>(query, allCommands)
      .map((r) => r.item)
      .slice(0, 20);
  }, [query, allCommands]);

  return { isOpen, query, filtered, open, close, setQuery };
}
