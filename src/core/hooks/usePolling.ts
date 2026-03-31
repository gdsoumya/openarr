import { useEffect, useRef, useCallback } from 'react';

export function usePolling(callback: () => Promise<void>, intervalMs: number, enabled = true) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;
  const poll = useCallback(async () => { await savedCallback.current(); }, []);
  useEffect(() => {
    if (!enabled) return;
    poll();
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [poll, intervalMs, enabled]);
}
