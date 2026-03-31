import { useServerStore } from '../../stores/serverStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { ServiceId } from '../theme/tokens';
import { ServiceConfig } from '../types/services';

export function useActiveServer() {
  const server = useServerStore((s) => s.getActiveServer());
  const isLocal = useConnectionStore((s) => s.isLocal);
  return { server, isLocal };
}

export function useServiceConfig(serviceId: ServiceId): ServiceConfig | undefined {
  return useServerStore((s) => s.getServiceConfig(serviceId));
}
