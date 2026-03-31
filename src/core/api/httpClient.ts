import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ServiceConfig } from '../types/services';

// Prowlarr search fans out to many indexers and can take a while
const TIMEOUT_MS: Record<string, number> = {
  prowlarr: 120000,
  default: 30000,
};

export function createServiceClient(config: ServiceConfig, isLocal: boolean): AxiosInstance {
  const baseURL = isLocal ? config.localUrl : config.remoteUrl;
  const fullBaseURL = config.basePath ? `${baseURL}${config.basePath}` : baseURL;
  const timeout = TIMEOUT_MS[config.serviceId] ?? TIMEOUT_MS.default;

  const client = axios.create({
    baseURL: fullBaseURL,
    timeout,
  });

  // API key auth (for *arr services)
  if (config.apiKey) {
    client.interceptors.request.use((req: InternalAxiosRequestConfig) => {
      if (config.serviceId === 'bazarr') {
        // Bazarr: use query param (header can be blocked by reverse proxies)
        // Also set header as fallback for direct connections
        req.params = { ...req.params, apikey: config.apiKey };
        req.headers.set('X-API-KEY', config.apiKey);
      } else {
        req.headers.set('X-Api-Key', config.apiKey);
      }
      return req;
    });
  }

  // HTTP basic auth
  if (config.username && config.password) {
    client.defaults.auth = {
      username: config.username,
      password: config.password,
    };
  }

  // Custom headers
  if (config.customHeaders) {
    Object.entries(config.customHeaders).forEach(([key, value]) => {
      client.defaults.headers.common[key] = value;
    });
  }

  return client;
}

export function createTransmissionClient(config: ServiceConfig, isLocal: boolean): AxiosInstance {
  // Build the full URL first (base + basePath), then append /rpc
  const client = createServiceClient(config, isLocal);

  // Fix the baseURL to ensure it ends with /rpc
  if (client.defaults.baseURL) {
    const trimmed = client.defaults.baseURL.replace(/\/+$/, '');
    if (!trimmed.endsWith('/rpc')) {
      client.defaults.baseURL = `${trimmed}/rpc`;
    }
  }
  let csrfToken: string | null = null;

  client.interceptors.request.use((req: InternalAxiosRequestConfig) => {
    if (csrfToken) {
      req.headers.set('X-Transmission-Session-Id', csrfToken);
    }
    return req;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 409) {
        const retries = (error.config as any).__csrfRetryCount ?? 0;
        if (retries >= 2) return Promise.reject(error);
        (error.config as any).__csrfRetryCount = retries + 1;
        csrfToken = error.response.headers['x-transmission-session-id'];
        if (csrfToken && error.config) {
          error.config.headers['X-Transmission-Session-Id'] = csrfToken;
          // Re-apply auth for retry — axios doesn't carry defaults.auth on retried configs
          if (config.username && config.password) {
            const credentials = `${config.username}:${config.password}`;
            const encoded = typeof btoa === 'function'
              ? btoa(credentials)
              : Buffer.from(credentials).toString('base64');
            error.config.headers['Authorization'] = `Basic ${encoded}`;
          }
          return client.request(error.config);
        }
      }
      return Promise.reject(error);
    },
  );

  return client;
}
