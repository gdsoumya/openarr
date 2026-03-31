import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { colors, spacing, radii, typography } from '../theme/tokens';
import { OMDBRatings } from '../../services/omdb/client';

interface RatingsBarProps {
  ratings: OMDBRatings | null;
  tmdbRating?: number;
  loading?: boolean;
  title?: string;
  imdbId?: string;
  tmdbId?: number;
  type?: 'tv' | 'movie';
}

function openUrl(url: string) { Linking.openURL(url).catch(() => {}); }

function encTitle(title?: string) { return encodeURIComponent(title ?? ''); }

export function RatingsBar({ ratings, tmdbRating, loading, title, imdbId, tmdbId, type }: RatingsBarProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading ratings...</Text>
      </View>
    );
  }

  if (!ratings && !tmdbRating) return null;

  return (
    <View style={styles.container}>
      {/* IMDB */}
      {ratings && ratings.imdbRating !== 'N/A' && (
        <Pressable style={styles.ratingItem} onPress={() => {
          if (imdbId) openUrl(`https://www.imdb.com/title/${imdbId}/`);
          else openUrl(`https://www.imdb.com/find/?q=${encTitle(title)}`);
        }}>
          <Text style={styles.ratingIcon}>⭐</Text>
          <View>
            <Text style={styles.ratingValue}>{ratings.imdbRating}</Text>
            <Text style={styles.ratingLabel}>IMDb</Text>
          </View>
        </Pressable>
      )}

      {/* Rotten Tomatoes */}
      {ratings?.rottenTomatoesCritic && (
        <Pressable style={styles.ratingItem} onPress={() => {
          openUrl(`https://www.rottentomatoes.com/search?search=${encTitle(title)}`);
        }}>
          <Text style={styles.ratingIcon}>{parseInt(ratings.rottenTomatoesCritic) >= 60 ? '🍅' : '🤢'}</Text>
          <View>
            <Text style={styles.ratingValue}>{ratings.rottenTomatoesCritic}</Text>
            <Text style={styles.ratingLabel}>Tomatometer</Text>
          </View>
        </Pressable>
      )}

      {/* Metacritic */}
      {ratings?.metacritic && (
        <Pressable style={styles.ratingItem} onPress={() => {
          openUrl(`https://www.metacritic.com/search/${encTitle(title)}/`);
        }}>
          <View style={[styles.metacriticBadge, {
            backgroundColor: getMetacriticColor(ratings.metacritic),
          }]}>
            <Text style={styles.metacriticText}>{ratings.metacritic.replace('/100', '')}</Text>
          </View>
          <View>
            <Text style={styles.ratingValue}>{ratings.metacritic}</Text>
            <Text style={styles.ratingLabel}>Metacritic</Text>
          </View>
        </Pressable>
      )}

      {/* TMDB */}
      {tmdbRating !== undefined && tmdbRating > 0 && (
        <Pressable style={styles.ratingItem} onPress={() => {
          if (tmdbId) openUrl(`https://www.themoviedb.org/${type === 'tv' ? 'tv' : 'movie'}/${tmdbId}`);
          else openUrl(`https://www.themoviedb.org/search?query=${encTitle(title)}`);
        }}>
          <Text style={styles.ratingIcon}>🎬</Text>
          <View>
            <Text style={styles.ratingValue}>{tmdbRating.toFixed(1)}</Text>
            <Text style={styles.ratingLabel}>TMDB</Text>
          </View>
        </Pressable>
      )}

      {/* Content rating */}
      {ratings?.rated && ratings.rated !== 'N/A' && (
        <View style={styles.contentRating}>
          <Text style={styles.contentRatingText}>{ratings.rated}</Text>
        </View>
      )}
    </View>
  );
}

function getMetacriticColor(score: string): string {
  const num = parseInt(score);
  if (num >= 75) return '#66cc33';
  if (num >= 50) return '#ffcc33';
  return '#ff0000';
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexWrap: 'wrap',
  },
  loadingText: { ...typography.micro, color: colors.textMuted },
  ratingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ratingIcon: { fontSize: 18 },
  ratingValue: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 14 },
  ratingLabel: { ...typography.micro, color: colors.textMuted, fontSize: 10 },
  metacriticBadge: {
    width: 26,
    height: 26,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metacriticText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  contentRating: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  contentRatingText: { ...typography.micro, color: colors.textMuted, fontWeight: '600' },
});
