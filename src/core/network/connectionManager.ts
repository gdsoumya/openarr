import * as Network from 'expo-network';
import { useConnectionStore } from '../../stores/connectionStore';
import { useServerStore } from '../../stores/serverStore';
import { clearAdapters } from '../../services/adapterFactory';

export async function detectConnectionType(): Promise<boolean> {
  const mode = useConnectionStore.getState().mode;
  if (mode === 'local') return true;
  if (mode === 'remote') return false;
  try {
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected) return false;

    const server = useServerStore.getState().getActiveServer();
    if (!server || server.homeSSIDs.length === 0) return true;

    // WiFi SSID detection requires location permission on both platforms
    // For now, default to local if on WiFi, remote if on cellular
    const isWifi = networkState.type === Network.NetworkStateType.WIFI;
    return isWifi;
  } catch {
    return true;
  }
}

export async function updateConnectionState(): Promise<void> {
  const isLocal = await detectConnectionType();
  const currentIsLocal = useConnectionStore.getState().isLocal;

  if (isLocal !== currentIsLocal) {
    useConnectionStore.getState().setIsLocal(isLocal);
    clearAdapters(); // Force re-creation with new URLs
  }
}

export function startConnectionMonitoring(intervalMs = 30000): () => void {
  updateConnectionState();
  const id = setInterval(updateConnectionState, intervalMs);
  return () => clearInterval(id);
}
