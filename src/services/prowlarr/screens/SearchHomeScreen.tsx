import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedAlert } from '../../../core/components/ThemedAlert';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { FilterChips } from '../../../core/components/FilterChips';
import { SearchResult, SearchType, Indexer, IndexerStats } from '../types';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getProwlarrAdapter, getTransmissionAdapter } from '../../../services/adapterFactory';
import { useServerStore } from '../../../stores/serverStore';
import { useToastStore } from '../../../core/hooks/useToast';

export function SearchHomeScreen() {
  const { alert } = useThemedAlert();
  const insets = useSafeAreaInsets();
  const config = useServiceConfig('prowlarr');
  const isLocal = useConnectionStore((s) => s.isLocal);
  const adapter = useMemo(() => config ? getProwlarrAdapter(config, isLocal) : null, [config, isLocal]);
  const txConfig = useServerStore((s) => s.getServiceConfig('transmission'));
  const showToast = useToastStore((s) => s.show);

  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('search');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [indexers, setIndexers] = useState<Indexer[]>([]);
  const [indexerStats, setIndexerStats] = useState<IndexerStats[]>([]);

  const typeChips = [
    { id: 'search', label: 'All' }, { id: 'tvsearch', label: 'TV' },
    { id: 'moviesearch', label: 'Movies' }, { id: 'audiosearch', label: 'Audio' },
  ];

  const tabs = ['Search', 'Indexers', 'Stats', 'History'];

  function formatSize(bytes: number): string {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  function formatAge(hours: number): string {
    if (hours >= 720) return `${Math.floor(hours / 720)}mo`;
    if (hours >= 24) return `${Math.floor(hours / 24)}d`;
    return `${hours}h`;
  }

  const grabResult = async (item: SearchResult) => {
    if (!item.downloadUrl) { alert('Error', 'No download URL available'); return; }
    if (!txConfig) { alert('Error', 'Transmission not configured'); return; }
    try {
      const tx = getTransmissionAdapter(txConfig, isLocal);
      await tx.addTorrent({ filename: item.downloadUrl });
      alert('Sent to Transmission', item.title);
    } catch (e: any) { alert('Error', e.message); }
  };

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    if (!adapter) { alert('Not Configured', 'Set up Prowlarr in Settings to search indexers.'); return; }
    setLoading(true);
    setResults([]);
    try {
      const data = await adapter.search({ query: query.trim(), type: searchType });
      setResults(data);
    } catch (e: any) {
      alert('Search Failed', e.response
        ? `HTTP ${e.response.status}: ${e.config?.baseURL || ''}${e.config?.url || ''}`
        : e.message || 'Unknown error');
    }
    setLoading(false);
  }, [adapter, query, searchType]);

  useEffect(() => {
    if (!adapter) return;
    if (activeTab === 'indexers') {
      adapter.getIndexers().then(setIndexers).catch(() => {});
    } else if (activeTab === 'stats') {
      adapter.getIndexerStats().then(setIndexerStats).catch(() => {});
    }
  }, [adapter, activeTab]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Search</Text>
        {adapter && (
          <Pressable style={styles.syncBtn} onPress={async () => {
            showToast('Testing indexers & syncing...', 'info');
            try {
              await Promise.all([adapter.testAllIndexers().catch(() => {}), adapter.syncIndexers().catch(() => {})]);
              showToast('Indexer sync complete', 'success');
            } catch (e: any) { showToast('Sync failed', 'error'); }
          }}>
            <Ionicons name="sync" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={styles.tabs}>
        {tabs.map(tab => (
          <Pressable key={tab} style={[styles.tab, activeTab === tab.toLowerCase() && styles.tabActive]}
            onPress={() => setActiveTab(tab.toLowerCase())}>
            <Text style={[styles.tabText, activeTab === tab.toLowerCase() && styles.tabTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {!config && (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Prowlarr not configured. Add it in Settings to search indexers.</Text>
        </View>
      )}

      {config && activeTab === 'search' && (
        <>
          <View style={styles.searchRow}>
            <TextInput style={styles.searchInput} value={query} onChangeText={setQuery}
              placeholder="Search indexers..." placeholderTextColor={colors.textMuted}
              returnKeyType="search" autoCapitalize="none"
              onSubmitEditing={doSearch} />
          </View>
          <FilterChips chips={typeChips} activeId={searchType} onSelect={(id) => setSearchType(id as SearchType)} />
          {loading && (
            <View style={styles.searchingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.searchingText}>Searching...</Text>
            </View>
          )}
          {!loading && (
            <FlashList data={results} estimatedItemSize={80}
              renderItem={({ item }) => (
                <Pressable style={styles.resultItem} onPress={() => grabResult(item)}>
                  <View style={styles.resultTop}>
                    <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.grabBadge}>
                      <Text style={styles.grabBadgeText}>GRAB</Text>
                    </View>
                  </View>
                  <View style={styles.resultStats}>
                    <Text style={styles.resultStat}>{formatSize(item.size)}</Text>
                    <Text style={styles.resultStat}>{formatAge(item.ageHours)}</Text>
                    {item.seeders !== undefined && <Text style={[styles.resultStat, { color: colors.success }]}>S:{item.seeders}</Text>}
                    {item.leechers !== undefined && <Text style={[styles.resultStat, { color: colors.error }]}>L:{item.leechers}</Text>}
                    <Text style={[styles.resultStat, { color: colors.primary }]}>{item.indexer}</Text>
                    <Text style={styles.resultStat}>{item.protocol}</Text>
                  </View>
                </Pressable>
              )}
              keyExtractor={(item) => item.guid}
              contentContainerStyle={{ paddingBottom: 100 }}
              ListEmptyComponent={
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderText}>Enter a search term and press return</Text>
                </View>
              }
            />
          )}
        </>
      )}

      {config && activeTab === 'indexers' && (
        <FlashList
          data={indexers}
          estimatedItemSize={60}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={<View style={styles.placeholder}><Text style={styles.placeholderText}>No indexers configured</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.resultItem}>
              <View style={styles.resultTop}>
                <Text style={styles.resultTitle}>{item.name}</Text>
              </View>
              <View style={styles.resultStats}>
                <Text style={[styles.resultStat, { color: item.enable ? colors.primary : colors.textMuted }]}>
                  {item.enable ? 'Enabled' : 'Disabled'}
                </Text>
                <Text style={styles.resultStat}>{item.protocol}</Text>
                <Text style={styles.resultStat}>Priority: {item.priority}</Text>
              </View>
            </View>
          )}
        />
      )}

      {config && activeTab === 'stats' && (
        <FlashList
          data={indexerStats}
          estimatedItemSize={80}
          keyExtractor={(item) => String(item.indexerId)}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={<View style={styles.placeholder}><Text style={styles.placeholderText}>No stats available</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.resultItem}>
              <View style={styles.resultTop}>
                <Text style={styles.resultTitle}>{item.indexerName}</Text>
              </View>
              <View style={styles.resultStats}>
                <Text style={styles.resultStat}>Queries: {item.numberOfQueries}</Text>
                <Text style={styles.resultStat}>Grabs: {item.numberOfGrabs}</Text>
                <Text style={[styles.resultStat, { color: item.numberOfFailedQueries > 0 ? 'rgba(255,100,100,0.8)' : colors.textMuted }]}>
                  Failed: {item.numberOfFailedQueries}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {activeTab === 'history' && (
        <View style={styles.placeholder}><Text style={styles.placeholderText}>Search history will appear when connected</Text></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  title: { ...typography.h1, color: colors.textPrimary },
  syncBtn: { padding: spacing.sm },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: spacing.md },
  tab: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.caption, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  searchRow: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  searchInput: { ...typography.body, color: colors.textPrimary, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider, borderRadius: radii.lg, paddingHorizontal: spacing.lg, paddingVertical: 11 },
  resultItem: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  resultTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm },
  resultTitle: { ...typography.caption, fontWeight: '600', color: colors.textPrimary, lineHeight: 17, flex: 1 },
  grabBadge: { backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 2 },
  grabBadgeText: { ...typography.badge, color: colors.primary },
  resultStats: { flexDirection: 'row', gap: spacing.md },
  resultStat: { ...typography.micro, color: colors.textMuted },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  placeholderText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  searchingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  searchingText: { ...typography.caption, color: colors.textMuted },
});
