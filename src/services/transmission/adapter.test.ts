import { TransmissionAdapter } from './adapter';
import { TorrentStatus } from './types';

const mockPost = jest.fn();
jest.mock('../../core/api/httpClient', () => ({
  createTransmissionClient: () => ({ post: mockPost }),
}));

describe('TransmissionAdapter', () => {
  let adapter: TransmissionAdapter;

  beforeEach(() => {
    mockPost.mockReset();
    adapter = new TransmissionAdapter(
      {
        serviceId: 'transmission' as const,
        enabled: true,
        localUrl: 'http://localhost:9091/transmission/rpc',
        remoteUrl: 'http://localhost:9091/transmission/rpc',
      },
      true,
    );
  });

  test('getTorrents sends torrent-get RPC', async () => {
    mockPost.mockResolvedValue({
      data: {
        result: 'success',
        arguments: {
          torrents: [
            {
              id: 1,
              name: 'test.torrent',
              status: TorrentStatus.Downloading,
              percentDone: 0.5,
            },
          ],
        },
      },
    });
    const torrents = await adapter.getTorrents();
    expect(mockPost).toHaveBeenCalledWith('', expect.objectContaining({ method: 'torrent-get' }));
    expect(torrents).toHaveLength(1);
    expect(torrents[0].name).toBe('test.torrent');
  });

  test('addTorrent sends torrent-add RPC', async () => {
    mockPost.mockResolvedValue({
      data: {
        result: 'success',
        arguments: { 'torrent-added': { id: 2, name: 'new' } },
      },
    });
    await adapter.addTorrent({ filename: 'magnet:?xt=urn:btih:abc123' });
    expect(mockPost).toHaveBeenCalledWith(
      '',
      expect.objectContaining({
        method: 'torrent-add',
        arguments: expect.objectContaining({ filename: 'magnet:?xt=urn:btih:abc123' }),
      }),
    );
  });

  test('getSessionStats returns stats', async () => {
    mockPost.mockResolvedValue({
      data: {
        result: 'success',
        arguments: {
          activeTorrentCount: 3,
          downloadSpeed: 1000,
          uploadSpeed: 500,
          pausedTorrentCount: 1,
          torrentCount: 4,
        },
      },
    });
    const stats = await adapter.getSessionStats();
    expect(stats.activeTorrentCount).toBe(3);
  });

  test('startTorrents sends torrent-start', async () => {
    mockPost.mockResolvedValue({ data: { result: 'success', arguments: {} } });
    await adapter.startTorrents([1, 2]);
    expect(mockPost).toHaveBeenCalledWith('', { method: 'torrent-start', arguments: { ids: [1, 2] } });
  });

  test('removeTorrents with deleteLocalData', async () => {
    mockPost.mockResolvedValue({ data: { result: 'success', arguments: {} } });
    await adapter.removeTorrents([1], true);
    expect(mockPost).toHaveBeenCalledWith('', {
      method: 'torrent-remove',
      arguments: { ids: [1], 'delete-local-data': true },
    });
  });
});
