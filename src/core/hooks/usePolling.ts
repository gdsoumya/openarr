import { useEffect, useRef } from 'react';

export function usePolling(callback: () => Promise<void>, intervalMs: number, enabled = true) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function tick() {
      try { await savedCallback.current(); } catch {}
      if (!cancelled) timeoutId = setTimeout(tick, intervalMs);
    }

    tick();
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [intervalMs, enabled]);
}
