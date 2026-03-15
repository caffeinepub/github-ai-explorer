import { useCallback, useState } from "react";
import {
  type CommandSuggestion,
  type ErrorAnalysis,
  analyzeErrorEnhanced,
} from "../utils/aiCommandRules";

export function useAIErrorAnalysis() {
  const [fixes, setFixes] = useState<CommandSuggestion[]>([]);
  const [rootCause, setRootCause] = useState("");
  const [hasError, setHasError] = useState(false);

  const analyze = useCallback(
    (command: string, stderr: string, exitCode: number) => {
      if (exitCode === 0) {
        setFixes([]);
        setRootCause("");
        setHasError(false);
        return;
      }
      const result: ErrorAnalysis = analyzeErrorEnhanced(
        command,
        stderr,
        exitCode,
      );
      setFixes(result.fixes);
      setRootCause(result.rootCause);
      setHasError(result.fixes.length > 0);
    },
    [],
  );

  const dismiss = useCallback(() => {
    setFixes([]);
    setRootCause("");
    setHasError(false);
  }, []);

  return { fixes, rootCause, hasError, analyze, dismiss };
}
