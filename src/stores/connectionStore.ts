import { create } from 'zustand';
import { ServiceId } from '../core/theme/tokens';
import { ConnectionState } from '../core/types/common';
import { appStorage } from '../core/storage/storage';

export type ConnectionMode = 'auto' | 'local' | 'remote';
const MODE_KEY = 'openarr.connectionMode';

interface ConnectionStoreState {
  isLocal: boolean;
  // Manual override for networks where Wi-Fi ≠ home (auto assumes any Wi-Fi is local)
  mode: ConnectionMode;
  serviceConnections: Partial<Record<ServiceId, ConnectionState>>;
  setMode: (mode: ConnectionMode) => void;
  setIsLocal: (isLocal: boolean) => void;
  setServiceConnection: (serviceId: ServiceId, state: ConnectionState) => void;
  getServiceConnection: (serviceId: ServiceId) => ConnectionState;
}

const defaultConnection: ConnectionState = {
  status: 'disconnected',
  isLocal: false,
  lastChecked: 0,
};

export const useConnectionStore = create<ConnectionStoreState>((set, get) => ({
  isLocal: true,
  mode: (appStorage.getValue(MODE_KEY) as ConnectionMode) ?? 'auto',
  serviceConnections: {},

  setMode: (mode) => {
    appStorage.setValue(MODE_KEY, mode);
    set({ mode });
  },

  setIsLocal: (isLocal) => set({ isLocal }),

  setServiceConnection: (serviceId, state) =>
    set((prev) => ({
      serviceConnections: { ...prev.serviceConnections, [serviceId]: state },
    })),

  getServiceConnection: (serviceId) => {
    return get().serviceConnections[serviceId] ?? defaultConnection;
  },
}));
