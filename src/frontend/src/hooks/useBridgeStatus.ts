import { useState, useEffect, useCallback } from 'react';
import { checkHealth } from '../services/bridgeApi';

export type BridgeStatus = 'connecting' | 'connected' | 'disconnected';

export function useBridgeStatus() {
  const [status, setStatus] = useState<BridgeStatus>('connecting');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const poll = useCallback(async () => {
    const ok = await checkHealth();
    setStatus(ok ? 'connected' : 'disconnected');
    setLastChecked(new Date());
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [poll]);

  return { status, lastChecked, refresh: poll };
}
