import { useState, useCallback } from 'react';
import { generateCommandSuggestions, type CommandSuggestion } from '../utils/aiCommandRules';

export function useAICommandSuggestion() {
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const suggest = useCallback((input: string) => {
    if (!input.trim()) {
      setSuggestions([]);
      return;
    }
    setIsThinking(true);
    // Simulate a brief "thinking" delay for UX
    setTimeout(() => {
      const results = generateCommandSuggestions(input);
      setSuggestions(results);
      setIsThinking(false);
    }, 300);
  }, []);

  const clear = useCallback(() => {
    setSuggestions([]);
  }, []);

  return { suggestions, isThinking, suggest, clear };
}
