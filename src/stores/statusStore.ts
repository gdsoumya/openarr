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

export const useStatusStore = create<StatusState>((set, get) => ({
  statuses: {},
  lastFetched: 0,

  refresh: async (services, isLocal, force = false) => {
    if (!force && Date.now() - get().lastFetched < TTL_MS) return;
    if (inFlight) return inFlight;
    inFlight = (async () => {
      const results = await Promise.allSettled(services.map(async (svc) => ({
        id: svc.serviceId,
        status: await getAdapter(svc, isLocal).getStatus(),
      })));
      const next: Partial<Record<ServiceId, ServiceStatus>> = {};
      results.forEach((r) => { if (r.status === 'fulfilled') next[r.value.id] = r.value.status; });
      set({ statuses: next, lastFetched: Date.now() });
    })().finally(() => { inFlight = null; });
    return inFlight;
  },
}));
