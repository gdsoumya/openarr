import { create } from 'zustand';
import { ServiceId } from '../core/theme/tokens';
import { ConnectionState } from '../core/types/common';

interface ConnectionStoreState {
  isLocal: boolean;
  serviceConnections: Partial<Record<ServiceId, ConnectionState>>;
  subsBadgeCount: number;
  setIsLocal: (isLocal: boolean) => void;
  setServiceConnection: (serviceId: ServiceId, state: ConnectionState) => void;
  getServiceConnection: (serviceId: ServiceId) => ConnectionState;
  setSubsBadgeCount: (count: number) => void;
}

const defaultConnection: ConnectionState = {
  status: 'disconnected',
  isLocal: false,
  lastChecked: 0,
};

export const useConnectionStore = create<ConnectionStoreState>((set, get) => ({
  isLocal: true,
  serviceConnections: {},
  subsBadgeCount: 0,

  setIsLocal: (isLocal) => set({ isLocal }),
  setSubsBadgeCount: (count) => set({ subsBadgeCount: count }),

  setServiceConnection: (serviceId, state) =>
    set((prev) => ({
      serviceConnections: { ...prev.serviceConnections, [serviceId]: state },
    })),

  getServiceConnection: (serviceId) => {
    return get().serviceConnections[serviceId] ?? defaultConnection;
  },
}));
