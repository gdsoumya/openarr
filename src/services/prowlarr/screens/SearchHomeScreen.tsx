import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { colors, spacing, radii, typography } from '../../../core/theme/tokens';
import { FilterChips } from '../../../core/components/FilterChips';
import { SearchResult, SearchType } from '../types';

export function SearchHomeScreen() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('search');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeTab, setActiveTab] = useState('search');

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

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Search</Text></View>

      <View style={styles.tabs}>
        {tabs.map(tab => (
          <Pressable key={tab} style={[styles.tab, activeTab === tab.toLowerCase() && styles.tabActive]}
            onPress={() => setActiveTab(tab.toLowerCase())}>
            <Text style={[styles.tabText, activeTab === tab.toLowerCase() && styles.tabTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'search' && (
        <>
          <View style={styles.searchRow}>
            <TextInput style={styles.searchInput} value={query} onChangeText={setQuery}
              placeholder="Search indexers..." placeholderTextColor={colors.textMuted} returnKeyType="search" autoCapitalize="none" />
          </View>
          <FilterChips chips={typeChips} activeId={searchType} onSelect={(id) => setSearchType(id as SearchType)} />
          <FlashList data={results} estimatedItemSize={80}
            renderItem={({ item }) => (
              <Pressable style={styles.resultItem}>
                <View style={styles.resultTop}>
                  <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
                </View>
                <View style={styles.resultStats}>
                  <Text style={styles.resultStat}>{formatSize(item.size)}</Text>
                  <Text style={styles.resultStat}>{formatAge(item.ageHours)}</Text>
                  {item.seeders !== undefined && <Text style={styles.resultStat}>S:{item.seeders}</Text>}
                  {item.leechers !== undefined && <Text style={styles.resultStat}>L:{item.leechers}</Text>}
                  <Text style={[styles.resultStat, { color: colors.primary }]}>{item.indexer}</Text>
                </View>
              </Pressable>
            )}
            keyExtractor={(item) => item.guid}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        </>
      )}

      {activeTab === 'indexers' && (
        <View style={styles.placeholder}><Text style={styles.placeholderText}>Indexer status will appear when connected to Prowlarr</Text></View>
      )}
      {activeTab === 'stats' && (
        <View style={styles.placeholder}><Text style={styles.placeholderText}>Indexer statistics will appear when connected</Text></View>
      )}
      {activeTab === 'history' && (
        <View style={styles.placeholder}><Text style={styles.placeholderText}>Search history will appear when connected</Text></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceBase },
  header: { paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.sm },
  title: { ...typography.h1, color: colors.textPrimary },
  tabs: { flexDirection: 'row', paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.divider, marginBottom: spacing.md },
  tab: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { ...typography.caption, fontWeight: '500', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  searchRow: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  searchInput: { ...typography.body, color: colors.textPrimary, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: colors.divider, borderRadius: radii.lg, paddingHorizontal: spacing.lg, paddingVertical: 11 },
  resultItem: { marginHorizontal: spacing.xl, marginBottom: spacing.sm, backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.surfaceCardBorder, borderRadius: radii.lg, padding: spacing.md },
  resultTop: { marginBottom: spacing.sm },
  resultTitle: { ...typography.caption, fontWeight: '600', color: colors.textPrimary, lineHeight: 17 },
  resultStats: { flexDirection: 'row', gap: spacing.md },
  resultStat: { ...typography.micro, color: colors.textMuted },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxxl },
  placeholderText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
