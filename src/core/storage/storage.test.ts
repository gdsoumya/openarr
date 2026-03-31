import { AppStorage } from './storage';

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn().mockImplementation(() => {
    const store = new Map<string, string>();
    return {
      set: (key: string, value: string) => store.set(key, value),
      getString: (key: string) => store.get(key),
      delete: (key: string) => store.delete(key),
      contains: (key: string) => store.has(key),
      getAllKeys: () => [...store.keys()],
    };
  }),
}));

describe('AppStorage', () => {
  let storage: AppStorage;

  beforeEach(() => {
    storage = new AppStorage();
  });

  test('saves and retrieves server configs', () => {
    const server = { id: 'srv1', name: 'HomeServer', services: [], homeSSIDs: ['MyWiFi'] };
    storage.saveServer(server);
    const result = storage.getServers();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('HomeServer');
  });

  test('deletes a server config', () => {
    const server = { id: 'srv1', name: 'Test', services: [], homeSSIDs: [] };
    storage.saveServer(server);
    storage.deleteServer('srv1');
    expect(storage.getServers()).toHaveLength(0);
  });

  test('updates existing server', () => {
    const server = { id: 'srv1', name: 'Old', services: [], homeSSIDs: [] };
    storage.saveServer(server);
    storage.saveServer({ ...server, name: 'New' });
    expect(storage.getServers()[0].name).toBe('New');
  });

  test('saves and retrieves active server ID', () => {
    storage.setActiveServerId('srv1');
    expect(storage.getActiveServerId()).toBe('srv1');
  });
});
