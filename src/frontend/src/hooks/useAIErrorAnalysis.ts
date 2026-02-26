import { useState, useCallback } from 'react';
import { analyzeError, type CommandSuggestion } from '../utils/aiCommandRules';

export function useAIErrorAnalysis() {
  const [fixes, setFixes] = useState<CommandSuggestion[]>([]);
  const [hasError, setHasError] = useState(false);

  const analyze = useCallback((command: string, stderr: string, exitCode: number) => {
    if (exitCode === 0) {
      setFixes([]);
      setHasError(false);
      return;
    }
    const suggestions = analyzeError(command, stderr, exitCode);
    setFixes(suggestions);
    setHasError(suggestions.length > 0);
  }, []);

  const dismiss = useCallback(() => {
    setFixes([]);
    setHasError(false);
  }, []);

  return { fixes, hasError, analyze, dismiss };
}
