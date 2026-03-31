import { create } from 'zustand';
import { ServerConfig, ServiceConfig } from '../core/types/services';
import { ServiceId } from '../core/theme/tokens';
import { appStorage } from '../core/storage/storage';
import { clearAdapters } from '../services/adapterFactory';

interface ServerState {
  servers: ServerConfig[];
  activeServerId: string | undefined;
  addServer: (server: ServerConfig) => void;
  updateServer: (server: ServerConfig) => void;
  removeServer: (id: string) => void;
  setActiveServer: (id: string) => void;
  getActiveServer: () => ServerConfig | undefined;
  getServiceConfig: (serviceId: ServiceId) => ServiceConfig | undefined;
  loadFromStorage: () => void;
  reset: () => void;
}

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  activeServerId: undefined,

  addServer: (server) => {
    set((state) => ({ servers: [...state.servers, server] }));
    appStorage.saveServer(server);
  },

  updateServer: (server) => {
    set((state) => ({
      servers: state.servers.map((s) => (s.id === server.id ? server : s)),
    }));
    appStorage.saveServer(server);
    clearAdapters();
  },

  removeServer: (id) => {
    set((state) => ({
      servers: state.servers.filter((s) => s.id !== id),
      activeServerId: state.activeServerId === id ? undefined : state.activeServerId,
    }));
    appStorage.deleteServer(id);
    clearAdapters();
  },

  setActiveServer: (id) => {
    set({ activeServerId: id });
    appStorage.setActiveServerId(id);
  },

  getActiveServer: () => {
    const { servers, activeServerId } = get();
    return servers.find((s) => s.id === activeServerId);
  },

  getServiceConfig: (serviceId) => {
    const server = get().getActiveServer();
    return server?.services.find((s) => s.serviceId === serviceId && s.enabled);
  },

  loadFromStorage: () => {
    const servers = appStorage.getServers();
    const activeServerId = appStorage.getActiveServerId();
    set({ servers, activeServerId });
  },

  reset: () => set({ servers: [], activeServerId: undefined }),
}));
