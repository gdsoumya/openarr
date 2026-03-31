import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ServiceConfig } from '../types/services';

const TIMEOUT_MS = 15000;

export function createServiceClient(config: ServiceConfig, isLocal: boolean): AxiosInstance {
  const baseURL = isLocal ? config.localUrl : config.remoteUrl;
  const fullBaseURL = config.basePath ? `${baseURL}${config.basePath}` : baseURL;

  const client = axios.create({
    baseURL: fullBaseURL,
    timeout: TIMEOUT_MS,
  });

  // API key header (for *arr services)
  if (config.apiKey) {
    client.interceptors.request.use((req: InternalAxiosRequestConfig) => {
      if (config.serviceId === 'bazarr') {
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
  const client = createServiceClient(config, isLocal);
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
        csrfToken = error.response.headers['x-transmission-session-id'];
        if (csrfToken && error.config) {
          error.config.headers['X-Transmission-Session-Id'] = csrfToken;
          return client.request(error.config);
        }
      }
      return Promise.reject(error);
    },
  );

  return client;
}
