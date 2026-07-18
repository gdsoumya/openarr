import { create } from 'zustand';
import { ServiceId } from '../core/theme/tokens';
import { ConnectionState } from '../core/types/common';

interface ConnectionStoreState {
  isLocal: boolean;
  serviceConnections: Partial<Record<ServiceId, ConnectionState>>;
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
  serviceConnections: {},

  setIsLocal: (isLocal) => set({ isLocal }),

  setServiceConnection: (serviceId, state) =>
    set((prev) => ({
      serviceConnections: { ...prev.serviceConnections, [serviceId]: state },
    })),

  getServiceConnection: (serviceId) => {
    return get().serviceConnections[serviceId] ?? defaultConnection;
  },
}));
