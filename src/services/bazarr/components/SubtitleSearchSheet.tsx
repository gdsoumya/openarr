import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { EmptyState } from '../../../core/components/EmptyState';
import { ErrorState } from '../../../core/components/ErrorState';
import { SubtitleSearchResult } from '../types';

export type SubtitleSearchStatus = 'loading' | 'success' | 'error';

interface SubtitleSearchSheetProps {
  visible: boolean;
  status: SubtitleSearchStatus;
  error?: string;
  title: string;
  results: SubtitleSearchResult[];
  onDownload: (sub: SubtitleSearchResult) => void;
  onRetry: () => void;
  onDismiss: () => void;
}

export function SubtitleSearchSheet({ visible, status, error, title, results, onDownload, onRetry, onDismiss }: SubtitleSearchSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onDismiss}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.subtitle}>
              {status === 'loading' ? 'Searching providers...' : status === 'error' ? 'Search failed' : `${results.length} subtitles found`}
            </Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onDismiss}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>

        {status === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Querying subtitle providers, this can take a moment...</Text>
          </View>
        )}

        {status === 'error' && <ErrorState message={error ?? 'Search failed'} onRetry={onRetry} />}

        {status === 'success' && results.length === 0 && (
          <EmptyState icon="💬" title="No subtitles found" message="No provider returned results — check enabled providers and languages in Bazarr." />
        )}

        {status === 'success' && results.length > 0 && (
          <FlatList
            data={results}
            keyExtractor={(item, idx) => `${item.provider}:${item.subtitle}:${idx}`}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item: sub }) => (
              <Pressable style={styles.item} onPress={() => onDownload(sub)}>
                <View style={styles.row}>
                  <Text style={styles.provider}>{sub.provider}</Text>
                  <Text style={styles.score}>Score: {sub.score}</Text>
                </View>
                <Text style={styles.release} numberOfLines={2}>{sub.release_info?.join(', ') || 'Unknown release'}</Text>
                <View style={styles.row}>
                  <View style={styles.flagsRow}>
                    <Text style={styles.lang}>{sub.language}</Text>
                    {sub.hearing_impaired === 'True' && <Text style={styles.flag}>HI</Text>}
                    {sub.forced === 'True' && <Text style={styles.flag}>Forced</Text>}
                  </View>
                  {sub.uploader ? <Text style={styles.uploader} numberOfLines={1}>{sub.uploader}</Text> : null}
                </View>
                {sub.matches?.length > 0 && (
                  <Text style={styles.matches} numberOfLines={1}>✓ {sub.matches.join(', ')}</Text>
                )}
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: spacing.md },
  title: { ...typography.h3, color: colors.textPrimary },
  subtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  closeBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  closeBtnText: { ...typography.bodyBold, color: colors.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  loadingText: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg, textAlign: 'center' },
  item: { marginHorizontal: spacing.xl, marginTop: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  provider: { ...typography.bodyBold, color: colors.textPrimary },
  score: { ...typography.micro, color: colors.primary },
  release: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  flagsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 },
  lang: { ...typography.micro, color: colors.bazarr },
  flag: { ...typography.badge, color: colors.textMuted, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  uploader: { ...typography.micro, color: colors.textMuted, maxWidth: 140 },
  matches: { ...typography.micro, color: colors.success, marginTop: 4 },
});
