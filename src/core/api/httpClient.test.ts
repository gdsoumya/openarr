import { createServiceClient, createTransmissionClient } from './httpClient';

// We need to test the client creation logic
describe('createServiceClient', () => {
  test('creates client with local URL when isLocal is true', () => {
    const config = {
      serviceId: 'sonarr' as const,
      enabled: true,
      localUrl: 'http://192.168.1.100:8989',
      remoteUrl: 'https://sonarr.example.com',
      apiKey: 'test-api-key',
    };
    const client = createServiceClient(config, true);
    expect(client.defaults.baseURL).toBe('http://192.168.1.100:8989');
  });

  test('creates client with remote URL when isLocal is false', () => {
    const config = {
      serviceId: 'sonarr' as const,
      enabled: true,
      localUrl: 'http://192.168.1.100:8989',
      remoteUrl: 'https://sonarr.example.com',
      apiKey: 'test-api-key',
    };
    const client = createServiceClient(config, false);
    expect(client.defaults.baseURL).toBe('https://sonarr.example.com');
  });

  test('appends basePath to URL', () => {
    const config = {
      serviceId: 'sonarr' as const,
      enabled: true,
      localUrl: 'http://192.168.1.100',
      remoteUrl: 'https://example.com',
      basePath: '/sonarr',
    };
    const client = createServiceClient(config, true);
    expect(client.defaults.baseURL).toBe('http://192.168.1.100/sonarr');
  });

  test('sets basic auth when username and password provided', () => {
    const config = {
      serviceId: 'sonarr' as const,
      enabled: true,
      localUrl: 'http://localhost:8989',
      remoteUrl: 'http://localhost:8989',
      username: 'admin',
      password: 'secret',
    };
    const client = createServiceClient(config, true);
    expect(client.defaults.auth).toEqual({ username: 'admin', password: 'secret' });
  });

  test('sets custom headers', () => {
    const config = {
      serviceId: 'sonarr' as const,
      enabled: true,
      localUrl: 'http://localhost:8989',
      remoteUrl: 'http://localhost:8989',
      customHeaders: { 'X-Custom': 'value' },
    };
    const client = createServiceClient(config, true);
    expect(client.defaults.headers.common['X-Custom']).toBe('value');
  });
});

describe('createTransmissionClient', () => {
  test('creates client with transmission URL', () => {
    const config = {
      serviceId: 'transmission' as const,
      enabled: true,
      localUrl: 'http://192.168.1.100:9091/transmission/rpc',
      remoteUrl: 'http://192.168.1.100:9091/transmission/rpc',
    };
    const client = createTransmissionClient(config, true);
    expect(client.defaults.baseURL).toBe('http://192.168.1.100:9091/transmission/rpc');
  });
});
