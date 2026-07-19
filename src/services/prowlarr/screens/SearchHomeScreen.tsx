import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useThemedAlert } from '../../../core/components/ThemedAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { FilterChips } from '../../../core/components/FilterChips';
import { ActionSheet, ActionSheetOption } from '../../../core/components/ActionSheet';
import { ErrorState } from '../../../core/components/ErrorState';
import { formatReleaseAge, formatSize, peerHealthColor, ReleaseSortKey, sortReleases } from '../../shared-arr/releaseUtils';
import { SearchResult, SearchType, Indexer, IndexerStats } from '../types';
import { useServiceConfig } from '../../../core/hooks/useServer';
import { useConnectionStore } from '../../../stores/connectionStore';
import { getProwlarrAdapter, getTransmissionAdapter } from '../../../services/adapterFactory';
import { useServerStore } from '../../../stores/serverStore';
import { useToastStore } from '../../../core/hooks/useToast';
import { DashboardButton } from '../../../core/components/DashboardButton';

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
  const [searchState, setSearchState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [searchError, setSearchError] = useState('');
  const [sortBy, setSortBy] = useState<ReleaseSortKey | null>('seeders');
  const [protocolFilter, setProtocolFilter] = useState<'all' | 'torrent' | 'usenet'>('all');
  const [activeTab, setActiveTab] = useState('search');
  const [indexers, setIndexers] = useState<Indexer[]>([]);
  const [indexerStats, setIndexerStats] = useState<IndexerStats[]>([]);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);
  const [grabSheet, setGrabSheet] = useState<{ visible: boolean; item?: SearchResult }>({ visible: false });

  const typeChips = [
    { id: 'search', label: 'All' }, { id: 'tvsearch', label: 'TV' },
    { id: 'moviesearch', label: 'Movies' }, { id: 'audiosearch', label: 'Audio' },
  ];

  const tabs = ['Search', 'Indexers', 'Stats', 'History'];

  const sortChips: Array<{ id: ReleaseSortKey; label: string }> = [
    { id: 'seeders', label: 'Seeders' }, { id: 'age', label: 'Newest' }, { id: 'size', label: 'Largest' },
  ];

  const visibleResults = useMemo(() => {
    const filtered = protocolFilter === 'all' ? results : results.filter(r => r.protocol === protocolFilter);
    return sortReleases(filtered, sortBy);
  }, [results, sortBy, protocolFilter]);

  const grabViaProwlarr = async (item: SearchResult) => {
    if (!adapter) return;
    try {
      await adapter.grabSearchResult(item.guid, item.indexerId);
      showToast('Sent to download client via Prowlarr', 'success');
    } catch (e: any) { alert('Grab Failed', e.message); }
  };

  const grabViaTransmission = async (item: SearchResult) => {
    if (!item.downloadUrl) { alert('Error', 'No download URL available'); return; }
    if (!txConfig) { alert('Error', 'Transmission not configured'); return; }
    try {
      const tx = getTransmissionAdapter(txConfig, isLocal);
      await tx.addTorrent({ filename: item.downloadUrl });
      showToast('Sent to Transmission', 'success');
    } catch (e: any) { alert('Error', e.message); }
  };

  const grabResult = (item: SearchResult) => setGrabSheet({ visible: true, item });

  const grabOptions: ActionSheetOption[] = useMemo(() => {
    const item = grabSheet.item;
    if (!item) return [];
    const options: ActionSheetOption[] = [
      { label: 'Download via Prowlarr', icon: '⬇️', onPress: () => grabViaProwlarr(item) },
    ];
    if (txConfig && item.downloadUrl) {
      options.push({ label: 'Send directly to Transmission', icon: '🔁', onPress: () => grabViaTransmission(item) });
    }
    return options;
  }, [grabSheet.item, txConfig]);

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    if (!adapter) { alert('Not Configured', 'Set up Prowlarr in Settings to search indexers.'); return; }
    setSearchState('loading');
    setResults([]);
    try {
      const data = await adapter.search({ query: query.trim(), type: searchType });
      setResults(data);
      setSearchState('success');
    } catch (e: any) {
      setSearchError(e.response
        ? `HTTP ${e.response.status}: ${e.config?.baseURL || ''}${e.config?.url || ''}`
        : e.message || 'Unknown error');
      setSearchState('error');
    }
  }, [adapter, query, searchType]);

  useEffect(() => {
    if (!adapter) return;
    if (activeTab === 'indexers') {
      adapter.getIndexers().then(setIndexers).catch(() => {});
    } else if (activeTab === 'stats') {
      adapter.getIndexerStats().then(setIndexerStats).catch(() => {});
    } else if (activeTab === 'history') {
      adapter.getHistory(1, 50).then(r => setSearchHistory(r.records ?? [])).catch(() => {});
    }
  }, [adapter, activeTab]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerLeft}>
          <DashboardButton />
          <Text style={styles.title}>Search</Text>
        </View>
        {adapter && (
          <Pressable style={styles.syncChip} onPress={async () => {
            showToast('Testing indexers & syncing...', 'info');
            try {
              await Promise.all([adapter.testAllIndexers().catch(() => {}), adapter.syncIndexers().catch(() => {})]);
              showToast('Indexer sync complete', 'success');
            } catch (e: any) { showToast('Sync failed', 'error'); }
          }}>
            <Ionicons name="sync" size={14} color={colors.primary} />
            <Text style={styles.syncChipText}>Sync Indexers</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map(tab => (
            <Pressable key={tab} style={[styles.tab, activeTab === tab.toLowerCase() && styles.tabActive]}
              onPress={() => setActiveTab(tab.toLowerCase())}>
              <Text style={[styles.tabText, activeTab === tab.toLowerCase() && styles.tabTextActive]}>{tab}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
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
          {searchState === 'success' && results.length > 0 && (
            <View style={styles.sortWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
                <Text style={styles.sortLabel}>Sort:</Text>
                {sortChips.map((chip) => (
                  <Pressable key={chip.id} style={[styles.sortChip, sortBy === chip.id && styles.sortChipActive]}
                    onPress={() => setSortBy(prev => prev === chip.id ? null : chip.id)}>
                    <Text style={[styles.sortChipText, sortBy === chip.id && styles.sortChipTextActive]}>{chip.label}</Text>
                  </Pressable>
                ))}
                <Pressable style={[styles.sortChip, protocolFilter !== 'all' && styles.sortChipActive]}
                  onPress={() => setProtocolFilter(prev => prev === 'all' ? 'torrent' : prev === 'torrent' ? 'usenet' : 'all')}>
                  <Text style={[styles.sortChipText, protocolFilter !== 'all' && styles.sortChipTextActive]}>
                    {protocolFilter === 'all' ? 'All Protocols' : protocolFilter === 'torrent' ? 'Torrent' : 'Usenet'}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          )}
          {searchState === 'loading' && (
            <View style={styles.searchingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.searchingText}>Searching...</Text>
            </View>
          )}
          {searchState === 'error' && <ErrorState message={searchError} onRetry={doSearch} />}
          {(searchState === 'idle' || searchState === 'success') && (
            <FlashList data={visibleResults}
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
                    <Text style={styles.resultStat}>{formatReleaseAge(item)}</Text>
                    {item.seeders !== undefined && <Text style={[styles.resultStat, { color: peerHealthColor(item.seeders) }]}>S:{item.seeders}</Text>}
                    {item.leechers !== undefined && <Text style={styles.resultStat}>L:{item.leechers}</Text>}
                    <Text style={[styles.resultStat, { color: colors.primary }]}>{item.indexer}</Text>
                    <Text style={styles.resultStat}>{item.protocol}</Text>
                  </View>
                </Pressable>
              )}
              keyExtractor={(item) => `${item.indexerId}:${item.guid}`}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <View style={styles.placeholder}>
                  <Text style={styles.placeholderText}>
                    {searchState === 'idle'
                      ? 'Enter a search term and press return'
                      : protocolFilter !== 'all' && results.length > 0
                        ? 'No results match the protocol filter'
                        : 'No results found, try a different query or search type'}
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}

      {config && activeTab === 'indexers' && (
        <FlatList
          data={indexers}
         
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 20 }}
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
        <FlatList
          data={indexerStats}
         
          keyExtractor={(item) => String(item.indexerId)}
          contentContainerStyle={{ paddingBottom: 20 }}
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
        <FlatList data={searchHistory}
          renderItem={({ item: h }) => (
            <View style={styles.resultItem}>
              <Text style={styles.resultTitle} numberOfLines={1}>{h.data?.query ?? h.data?.source ?? 'Search'}</Text>
              <View style={styles.resultStats}>
                <Text style={[styles.resultStat, { color: h.successful ? colors.success : colors.error }]}>
                  {h.successful ? 'Success' : 'Failed'}
                </Text>
                <Text style={styles.resultStat}>{h.date ? new Date(h.date).toLocaleDateString() : ''}</Text>
              </View>
            </View>
          )}
          keyExtractor={(_, idx) => String(idx)}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<View style={styles.placeholder}><Text style={styles.placeholderText}>No search history</Text></View>}
        />
      )}
      </View>
      <ActionSheet
        visible={grabSheet.visible}
        title="Download Release"
        subtitle={grabSheet.item?.title}
        options={grabOptions}
        onClose={() => setGrabSheet({ visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  title: { ...typography.h1, color: colors.textPrimary },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  syncChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: radii.round, backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder },
  syncChipText: { ...typography.micro, color: colors.primary, fontWeight: '600' },
  tabsWrapper: { height: 44, borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: spacing.sm },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.xl, height: 44, alignItems: 'center' },
  tab: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.caption, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  searchRow: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  searchInput: { ...typography.body, color: colors.textPrimary, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.divider, borderRadius: radii.lg, paddingHorizontal: spacing.lg, paddingVertical: 11 },
  resultItem: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  resultTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm },
  resultTitle: { ...typography.caption, fontWeight: '600', color: colors.textPrimary, lineHeight: 17, flex: 1 },
  grabBadge: { backgroundColor: colors.primaryMuted, borderWidth: 1, borderColor: colors.primaryBorder, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 2 },
  grabBadgeText: { ...typography.badge, color: colors.primary },
  resultStats: { flexDirection: 'row', gap: spacing.md },
  resultStat: { ...typography.micro, color: colors.textMuted },
  placeholder: { alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xl },
  placeholderText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  searchingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  searchingText: { ...typography.caption, color: colors.textMuted },
  sortWrapper: { marginBottom: spacing.sm },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  sortLabel: { ...typography.micro, color: colors.textMuted },
  sortChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radii.round, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.divider },
  sortChipActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder },
  sortChipText: { ...typography.micro, color: colors.textMuted },
  sortChipTextActive: { color: colors.primary, fontWeight: '600' },
});
