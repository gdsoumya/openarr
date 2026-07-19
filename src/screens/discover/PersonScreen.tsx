import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../../core/theme/tokens';
import { CachedImage } from '../../core/components/CachedImage';
import { PosterCard } from '../../core/components/PosterCard';
import { ErrorState } from '../../core/components/ErrorState';
import { useLibraryStore } from '../../stores/libraryStore';
import { tmdb } from '../../services/tmdb/instance';
import { posterUrl, profileUrl, TMDBPerson, TMDBPersonCredit } from '../../services/tmdb/types';

export function PersonScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { personId } = route.params as { personId: number };
  const getBadge = useLibraryStore((s) => s.getBadge);

  const [person, setPerson] = useState<TMDBPerson | null>(null);
  const [credits, setCredits] = useState<TMDBPersonCredit[]>([]);
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [error, setError] = useState('');
  const [bioExpanded, setBioExpanded] = useState(false);

  const load = async () => {
    setState('loading');
    try {
      const [p, c] = await Promise.all([tmdb.getPerson(personId), tmdb.getPersonCombinedCredits(personId)]);
      setPerson(p);
      setCredits(c);
      setState('loaded');
    } catch (e: any) {
      setError(e.message ?? 'Failed to load person');
      setState('error');
    }
  };

  useEffect(() => { load(); }, [personId]);

  const filmography = useMemo(() => {
    const seen = new Set<string>();
    return credits
      .filter((c) => (c.media_type === 'movie' || c.media_type === 'tv') && c.poster_path)
      .filter((c) => {
        const key = `${c.media_type}:${c.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  }, [credits]);

  if (state === 'loading') {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (state === 'error' || !person) {
    return <ErrorState message={error} onRetry={load} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
      <View style={styles.header}>
        {person.profile_path ? (
          <CachedImage uri={profileUrl(person.profile_path, 'w342')} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <Text style={styles.photoFallbackText}>{person.name.slice(0, 2)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{person.name}</Text>
          {person.known_for_department ? <Text style={styles.department}>{person.known_for_department}</Text> : null}
          {person.birthday ? <Text style={styles.meta}>Born {person.birthday}{person.place_of_birth ? ` · ${person.place_of_birth}` : ''}</Text> : null}
        </View>
      </View>

      {person.biography ? (
        <Pressable style={styles.bioSection} onPress={() => setBioExpanded((e) => !e)}>
          <Text style={styles.bio} numberOfLines={bioExpanded ? undefined : 4}>{person.biography}</Text>
          <Text style={styles.bioToggle}>{bioExpanded ? 'Show less' : 'Read more'}</Text>
        </Pressable>
      ) : null}

      <Text style={styles.sectionTitle}>Filmography ({filmography.length})</Text>
      <View style={styles.grid}>
        {filmography.map((c) => (
          <PosterCard
            key={`${c.media_type}:${c.id}`}
            title={c.title ?? c.name ?? ''}
            subtitle={(c.release_date ?? c.first_air_date)?.slice(0, 4)}
            posterUrl={posterUrl(c.poster_path)}
            rating={c.vote_average || undefined}
            size="sm"
            badge={getBadge(c.media_type, c.id)}
            onPress={() => navigation.push('DiscoveryDetail', { item: { ...c, poster_path: c.poster_path }, type: c.media_type })}
            style={styles.gridItem}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', gap: spacing.lg, padding: spacing.xl, alignItems: 'center' },
  photo: { width: 100, height: 100, borderRadius: radii.round },
  photoFallback: { backgroundColor: colors.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
  photoFallbackText: { fontSize: 28, fontWeight: '700', color: 'rgba(255,255,255,0.15)' },
  name: { ...typography.h2, color: colors.textPrimary },
  department: { ...typography.caption, color: colors.primary, marginTop: 2 },
  meta: { ...typography.micro, color: colors.textMuted, marginTop: 4 },
  bioSection: { paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  bio: { ...typography.body, color: colors.textSecondary, lineHeight: 21 },
  bioToggle: { ...typography.caption, color: colors.primary, marginTop: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.textPrimary, paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: spacing.md },
  gridItem: { marginBottom: spacing.md },
});
