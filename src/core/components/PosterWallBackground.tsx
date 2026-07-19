import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CachedImage } from './CachedImage';
import { appStorage } from '../storage/storage';
import { tmdb, isTmdbConfigured } from '../../services/tmdb/instance';

const CACHE_KEY = 'openarr.bgPosters';
const CACHE_TTL = 24 * 60 * 60 * 1000;
const FETCH_COUNT = 24;

async function loadPosterUrls(): Promise<string[]> {
  try {
    const raw = appStorage.getValue(CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as { urls: string[]; at: number };
      if (cached.urls?.length && Date.now() - cached.at < CACHE_TTL) return cached.urls;
    }
  } catch {}
  if (!isTmdbConfigured()) return [];
  const [movies, shows] = await Promise.all([
    tmdb.getTrendingMovies().catch(() => []),
    tmdb.getTrendingShows().catch(() => []),
  ]);
  const urls = [...movies, ...shows]
    .map((i: any) => i.poster_path)
    .filter(Boolean)
    .slice(0, FETCH_COUNT)
    .map((p: string) => `https://image.tmdb.org/t/p/w185${p}`);
  if (urls.length) appStorage.setValue(CACHE_KEY, JSON.stringify({ urls, at: Date.now() }));
  return urls;
}

// Dimmed, tilted collage of trending posters under a heavy scrim — the wall
// stays atmospheric, never competes with content.
export function PosterWallBackground() {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadPosterUrls().then((u) => { if (!cancelled) setUrls(u); });
    return () => { cancelled = true; };
  }, []);

  const { width, height } = Dimensions.get('window');
  const tileW = Math.ceil(width / 4) + 8;
  const tileH = tileW * 1.5;
  // Oversized rotated canvas; repeat posters until the whole area is tiled
  const wallW = width * 1.7;
  const wallH = height * 1.7;
  const perRow = Math.ceil(wallW / tileW);
  const rows = Math.ceil(wallH / tileH);
  const tiles: string[] = [];
  for (let i = 0; i < perRow * rows && urls.length > 0; i++) tiles.push(urls[i % urls.length]);

  return (
    <>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0d0e1e' }]} />
      {tiles.length > 0 && (
        <View style={[styles.wall, { width: wallW, height: wallH, left: -width * 0.35, top: -height * 0.3 }]}>
          {tiles.map((u, i) => (
            <CachedImage key={`${u}-${i}`} uri={u} style={{ width: tileW, height: tileH }} />
          ))}
        </View>
      )}
      <LinearGradient
        colors={['rgba(13,14,30,0.90)', 'rgba(15,16,35,0.94)', 'rgba(10,11,24,0.98)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(100,255,218,0.05)', 'transparent']}
        start={{ x: 1, y: 0 }} end={{ x: 0.25, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wall: {
    position: 'absolute',
    flexDirection: 'row',
    flexWrap: 'wrap',
    transform: [{ rotate: '-8deg' }],
  },
});
