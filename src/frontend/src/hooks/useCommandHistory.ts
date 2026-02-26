import { useState, useCallback } from 'react';

export function useCommandHistory(history: string[]) {
  const [position, setPosition] = useState<number>(-1);

  const navigateUp = useCallback((): string | null => {
    if (history.length === 0) return null;
    const newPos = position === -1 ? history.length - 1 : Math.max(0, position - 1);
    setPosition(newPos);
    return history[newPos] ?? null;
  }, [history, position]);

  const navigateDown = useCallback((): string | null => {
    if (position === -1) return null;
    const newPos = position + 1;
    if (newPos >= history.length) {
      setPosition(-1);
      return '';
    }
    setPosition(newPos);
    return history[newPos] ?? null;
  }, [history, position]);

  const resetPosition = useCallback(() => {
    setPosition(-1);
  }, []);

  return { navigateUp, navigateDown, resetPosition };
}
