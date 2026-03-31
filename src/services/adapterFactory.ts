import { ServiceConfig } from '../core/types/services';
import { TransmissionAdapter } from './transmission/adapter';
import { SonarrAdapter } from './sonarr/adapter';
import { RadarrAdapter } from './radarr/adapter';
import { ProwlarrAdapter } from './prowlarr/adapter';
import { BazarrAdapter } from './bazarr/adapter';

type AnyAdapter = TransmissionAdapter | SonarrAdapter | RadarrAdapter | ProwlarrAdapter | BazarrAdapter;

const adapters = new Map<string, AnyAdapter>();

export function getAdapter(config: ServiceConfig, isLocal: boolean): AnyAdapter {
  const key = `${config.serviceId}-${isLocal ? 'local' : 'remote'}`;
  if (!adapters.has(key)) {
    switch (config.serviceId) {
      case 'transmission': adapters.set(key, new TransmissionAdapter(config, isLocal)); break;
      case 'sonarr': adapters.set(key, new SonarrAdapter(config, isLocal)); break;
      case 'radarr': adapters.set(key, new RadarrAdapter(config, isLocal)); break;
      case 'prowlarr': adapters.set(key, new ProwlarrAdapter(config, isLocal)); break;
      case 'bazarr': adapters.set(key, new BazarrAdapter(config, isLocal)); break;
    }
  }
  return adapters.get(key)!;
}

export function getTransmissionAdapter(config: ServiceConfig, isLocal: boolean): TransmissionAdapter {
  return getAdapter(config, isLocal) as TransmissionAdapter;
}

export function getSonarrAdapter(config: ServiceConfig, isLocal: boolean): SonarrAdapter {
  return getAdapter(config, isLocal) as SonarrAdapter;
}

export function getRadarrAdapter(config: ServiceConfig, isLocal: boolean): RadarrAdapter {
  return getAdapter(config, isLocal) as RadarrAdapter;
}

export function getProwlarrAdapter(config: ServiceConfig, isLocal: boolean): ProwlarrAdapter {
  return getAdapter(config, isLocal) as ProwlarrAdapter;
}

export function getBazarrAdapter(config: ServiceConfig, isLocal: boolean): BazarrAdapter {
  return getAdapter(config, isLocal) as BazarrAdapter;
}

export function clearAdapters(): void {
  adapters.clear();
}
