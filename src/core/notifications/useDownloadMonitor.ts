import { useEffect, useRef } from 'react';
import { useServerStore } from '../../stores/serverStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { getSonarrAdapter } from '../../services/adapterFactory';
import { checkForCompletedDownloads } from './downloadMonitor';

const INTERVAL_MS = 60000;

// App-level watcher so download-complete notifications fire no matter which
// screen is open (screen polling pauses when unfocused).
export function useDownloadMonitor() {
  const sonarrConfig = useServerStore((s) => s.getServiceConfig('sonarr'));
  const isLocal = useConnectionStore((s) => s.isLocal);
  const previousQueue = useRef<Array<{ id: number; title: string }>>([]);

  useEffect(() => {
    if (!sonarrConfig) return;
    let cancelled = false;
    // First tick after a config/server change only records a baseline , 
    // diffing against the previous server's queue would fire false
    // "download complete" notifications for every item on it
    let baselined = false;

    async function tick() {
      try {
        const sonarr = getSonarrAdapter(sonarrConfig!, isLocal);
        const queueData = await sonarr.getQueue(1, 50);
        const currentQueue = (queueData.records ?? []).map((q: any) => ({ id: q.id, title: q.title }));
        if (!cancelled) {
          if (baselined) checkForCompletedDownloads(currentQueue, previousQueue.current);
          previousQueue.current = currentQueue;
          baselined = true;
        }
      } catch {}
    }

    tick();
    const timer = setInterval(tick, INTERVAL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [sonarrConfig, isLocal]);
}
