import { useServerStore } from './serverStore';

jest.mock('../core/storage/storage', () => ({
  appStorage: {
    getServers: jest.fn(() => []),
    saveServer: jest.fn(),
    deleteServer: jest.fn(),
    getActiveServerId: jest.fn(() => undefined),
    setActiveServerId: jest.fn(),
  },
}));

describe('serverStore', () => {
  beforeEach(() => {
    useServerStore.getState().reset();
  });

  test('adds a server', () => {
    const server = { id: 'srv1', name: 'Test', services: [], homeSSIDs: [] };
    useServerStore.getState().addServer(server);
    expect(useServerStore.getState().servers).toHaveLength(1);
    expect(useServerStore.getState().servers[0].name).toBe('Test');
  });

  test('sets active server', () => {
    const server = { id: 'srv1', name: 'Test', services: [], homeSSIDs: [] };
    useServerStore.getState().addServer(server);
    useServerStore.getState().setActiveServer('srv1');
    expect(useServerStore.getState().activeServerId).toBe('srv1');
  });

  test('removes a server', () => {
    const server = { id: 'srv1', name: 'Test', services: [], homeSSIDs: [] };
    useServerStore.getState().addServer(server);
    useServerStore.getState().removeServer('srv1');
    expect(useServerStore.getState().servers).toHaveLength(0);
  });

  test('getActiveServer returns the active server', () => {
    const server = { id: 'srv1', name: 'Test', services: [], homeSSIDs: [] };
    useServerStore.getState().addServer(server);
    useServerStore.getState().setActiveServer('srv1');
    expect(useServerStore.getState().getActiveServer()?.name).toBe('Test');
  });
});
