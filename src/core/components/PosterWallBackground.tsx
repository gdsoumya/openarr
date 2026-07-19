import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CachedImage } from './CachedImage';
import { appStorage } from '../storage/storage';
import { tmdb, isTmdbConfigured } from '../../services/tmdb/instance';

const CACHE_KEY = 'openarr.bgPosters';
const CACHE_TTL = 24 * 60 * 60 * 1000;
const COLS = 4;
const ROWS = 6;

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
    .slice(0, COLS * ROWS)
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
  const tileW = Math.ceil(width / COLS) + 8;
  const tileH = tileW * 1.5;

  return (
    <>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0d0e1e' }]} />
      {urls.length > 0 && (
        <View style={[styles.wall, { width: width * 1.6, height: height * 1.6, left: -width * 0.3, top: -height * 0.25 }]}>
          {urls.map((u, i) => (
            <CachedImage key={u} uri={u} style={{ width: tileW, height: tileH, opacity: 0.9 }} />
          ))}
        </View>
      )}
      <LinearGradient
        colors={['rgba(13,14,30,0.82)', 'rgba(15,16,35,0.90)', 'rgba(10,11,24,0.97)']}
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
