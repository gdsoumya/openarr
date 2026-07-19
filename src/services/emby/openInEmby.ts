import { Linking } from 'react-native';
import { useServerStore } from '../../stores/serverStore';
import { useConnectionStore } from '../../stores/connectionStore';
import { getEmbyAdapter } from '../adapterFactory';
import { EmbyAdapter, EmbyItemRef } from './adapter';

// App deep link first, web item page as fallback
export async function openEmbyRef(emby: EmbyAdapter, item: EmbyItemRef): Promise<void> {
  try {
    await Linking.openURL(`emby://items/${item.ServerId}/${item.Id}`);
  } catch {
    await Linking.openURL(emby.itemWebUrl(item)).catch(() => {});
  }
}

// Opens the item in the Emby Android app via its emby://items deep link,
// falling back to the web item page when the app isn't installed.
// Returns an error message, or null on success.
export async function openInEmby(
  type: 'Movie' | 'Series',
  ids: { tmdbId?: number; imdbId?: string; tvdbId?: number },
): Promise<string | null> {
  const config = useServerStore.getState().getServiceConfig('emby');
  if (!config) return 'Emby is not configured, enable it in Settings → Server.';
  const emby = getEmbyAdapter(config, useConnectionStore.getState().isLocal);
  let item;
  try {
    item = await emby.findItem(type, ids);
  } catch (e: any) {
    return `Emby lookup failed: ${e.message}`;
  }
  if (!item) return 'Not found in your Emby library.';
  await openEmbyRef(emby, item);
  return null;
}
