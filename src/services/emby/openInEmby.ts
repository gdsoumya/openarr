import { Linking } from 'react-native';
import { useServerStore } from '../../stores/serverStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { getEmbyAdapter } from '../adapterFactory';

// Opens the item's Emby web page (the Android Emby app has no public
// per-item deep-link scheme). Returns an error message, or null on success.
export async function openInEmby(
  type: 'Movie' | 'Series',
  ids: { tmdbId?: number; imdbId?: string; tvdbId?: number },
): Promise<string | null> {
  const config = useServerStore.getState().getServiceConfig('emby');
  if (!config) return 'Emby is not configured — enable it in Settings → Server.';
  const emby = getEmbyAdapter(config, useConnectionStore.getState().isLocal);
  try {
    const item = await emby.findItem(type, ids);
    if (!item) return 'Not found in your Emby library.';
    await Linking.openURL(emby.itemWebUrl(item));
    return null;
  } catch (e: any) {
    return `Emby lookup failed: ${e.message}`;
  }
}
