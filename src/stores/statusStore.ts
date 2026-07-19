import { create } from 'zustand';
import { ServiceId } from '../core/theme/tokens';
import { ServiceConfig, ServiceStatus } from '../core/types/services';
import { getAdapter } from '../services/adapterFactory';

const TTL_MS = 20000;

interface StatusState {
  statuses: Partial<Record<ServiceId, ServiceStatus>>;
  lastFetched: number;
  // TTL + in-flight coalescing so Dashboard and Home share one status sweep
  refresh: (services: ServiceConfig[], isLocal: boolean, force?: boolean) => Promise<void>;
}

let inFlight: Promise<void> | null = null;
let sweepKey = '';

function keyOf(services: ServiceConfig[], isLocal: boolean): string {
  return `${isLocal}:${services.map((s) => s.serviceId + s.localUrl).join(',')}`;
}

export const useStatusStore = create<StatusState>((set, get) => ({
  statuses: {},
  lastFetched: 0,

  refresh: async (services, isLocal, force = false) => {
    const key = keyOf(services, isLocal);
    // A different server/service-set invalidates everything, never serve or
    // join a sweep that belongs to the previous server
    if (key !== sweepKey) {
      sweepKey = key;
      inFlight = null;
      set({ statuses: {}, lastFetched: 0 });
    } else {
      if (!force && Date.now() - get().lastFetched < TTL_MS) return;
      if (!force && inFlight) return inFlight;
    }
    const run = (async () => {
      const results = await Promise.allSettled(services.map(async (svc) => ({
        id: svc.serviceId,
        status: await getAdapter(svc, isLocal).getStatus(),
      })));
      if (sweepKey !== key) return; // superseded by a server switch mid-flight
      const next: Partial<Record<ServiceId, ServiceStatus>> = {};
      results.forEach((r) => { if (r.status === 'fulfilled') next[r.value.id] = r.value.status; });
      // Skip the publish when nothing changed, both Home and Dashboard
      // subscribe to this object and re-render on identity churn
      const prev = get().statuses;
      const changed = JSON.stringify(prev, (k, v) => (k === 'lastChecked' ? undefined : v))
        !== JSON.stringify(next, (k, v) => (k === 'lastChecked' ? undefined : v));
      set(changed ? { statuses: next, lastFetched: Date.now() } : { lastFetched: Date.now() });
    })().finally(() => { if (inFlight === run) inFlight = null; });
    inFlight = run;
    return run;
  },
}));
