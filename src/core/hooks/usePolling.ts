import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';

// Polls only while the owning screen is focused — unfocused tabs stay quiet
// instead of stacking background request loops.
export function usePolling(callback: () => Promise<void>, intervalMs: number, enabled = true) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;
  const isFocused = useIsFocused();
  const active = enabled && isFocused;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function tick() {
      try { await savedCallback.current(); } catch {}
      if (!cancelled) timeoutId = setTimeout(tick, intervalMs);
    }

    tick();
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [intervalMs, active]);
}
