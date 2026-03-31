import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, spacing, radii, typography } from '../core/theme/tokens';
import { Badge } from '../core/components/Badge';
import { CachedImage } from '../core/components/CachedImage';
import { useLibraryCache } from '../stores/libraryCache';
import { posterUrl, backdropUrl } from '../services/tmdb/types';
import { AddItemSheet } from '../services/shared-arr/components/AddItemSheet';

export function DiscoveryDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { item, type } = route.params ?? {}; // type: 'tv' | 'movie'
  const isInSonarr = useLibraryCache((s) => s.isInSonarr);
  const isInRadarr = useLibraryCache((s) => s.isInRadarr);
  const [showAddSheet, setShowAddSheet] = useState(false);

  if (!item) return <View style={styles.container}><Text style={styles.loading}>Loading...</Text></View>;

  const title = type === 'tv' ? item.name : item.title;
  const year = type === 'tv' ? item.first_air_date?.slice(0, 4) : item.release_date?.slice(0, 4);
  const rating = item.vote_average;
  const overview = item.overview;
  const poster = posterUrl(item.poster_path, 'w500');
  const backdrop = backdropUrl(item.backdrop_path);
  const inLibrary = type === 'tv' ? isInSonarr(item.id) : isInRadarr(item.id);
  const arrType = type === 'tv' ? 'sonarr' : 'radarr';

  return (
    <>
      <ScrollView style={styles.container}>
        {backdrop && <CachedImage uri={backdrop} style={styles.backdrop as any} />}
        <View style={styles.heroOverlay} />

        <View style={styles.heroContent}>
          {poster && <CachedImage uri={poster} style={styles.poster as any} />}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{year} · ★ {rating?.toFixed(1)}</Text>
            {inLibrary && <Badge label="In Library" variant="inLibrary" style={{ alignSelf: 'flex-start', marginTop: 8 }} />}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.overview}>{overview}</Text>
        </View>

        {!inLibrary && (
          <View style={styles.section}>
            <Pressable style={styles.addButton} onPress={() => setShowAddSheet(true)}>
              <Text style={styles.addButtonText}>Add to {type === 'tv' ? 'Sonarr' : 'Radarr'}</Text>
            </Pressable>
            <Pressable style={styles.addSearchButton} onPress={() => setShowAddSheet(true)}>
              <Text style={styles.addSearchButtonText}>Add + Search</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <AddItemSheet
        visible={showAddSheet}
        type={arrType}
        item={item}
        onDismiss={() => setShowAddSheet(false)}
        onAdded={() => {
          // Library cache will refresh on next poll; nothing extra needed here
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  loading: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: 100 },
  backdrop: { width: '100%', height: 220, resizeMode: 'cover' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 220, backgroundColor: 'rgba(15,16,35,0.5)' },
  heroContent: { flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.xl, marginTop: -60 },
  poster: { width: 100, height: 150, borderRadius: radii.md },
  titleBlock: { flex: 1, justifyContent: 'flex-end', paddingBottom: spacing.sm },
  title: { ...typography.h2, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  section: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  overview: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  addButton: { backgroundColor: colors.primary, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  addButtonText: { ...typography.bodyBold, color: '#0f1023' },
  addSearchButton: { backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: radii.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.sm },
  addSearchButtonText: { ...typography.bodyBold, color: colors.primary },
});
