import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNetwork } from '../context/NetworkContext';
import { listBuckets, R2Bucket } from '../services/s3';
import { cacheBuckets, getCachedBuckets } from '../services/offlineManager';
import BucketCard from '../components/BucketCard';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import NetworkBanner from '../components/NetworkBanner';
import SearchBar from '../components/SearchBar';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useTheme();
  const { isConnected } = useNetwork();

  const [buckets, setBuckets] = useState<R2Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchBuckets = useCallback(async () => {
    try {
      setError(null);
      if (isConnected) {
        const data = await listBuckets();
        setBuckets(data);
        await cacheBuckets(data);
      } else {
        const cached = await getCachedBuckets();
        if (cached) {
          setBuckets(cached);
        } else {
          setError('Aucune donnée en cache disponible');
        }
      }
    } catch (err: any) {
      // Fallback to cache on error
      const cached = await getCachedBuckets();
      if (cached) {
        setBuckets(cached);
      } else {
        setError(err.message || 'Erreur de connexion');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isConnected]);

  useEffect(() => {
    fetchBuckets();
  }, [fetchBuckets]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBuckets();
  }, [fetchBuckets]);

  const filteredBuckets = buckets.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderHeader = () => (
    <View>
      <NetworkBanner />
      {/* App Header */}
      <View style={[styles.appHeader, { borderBottomColor: colors.border }]}>
        <View style={styles.logoRow}>
          <Text style={styles.logoEmoji}>📚</Text>
          <View>
            <Text style={[styles.logoTitle, { color: colors.text }]}>Gestion de Cours</Text>
            <Text style={[styles.logoSub, { color: colors.textSecondary }]}>Cloudflare R2</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => router.push('/downloads')}
          >
            <Ionicons name="cloud-download" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surfaceSecondary }]}
            onPress={toggleTheme}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={20} color={colors.icon} />
          </TouchableOpacity>
        </View>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un cours…" />

      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        Cours disponibles ({filteredBuckets.length})
      </Text>
    </View>
  );

  if (loading) return <LoadingState message="Chargement des cours…" />;

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="cloud-offline"
          title="Erreur de connexion"
          subtitle={error}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredBuckets}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <BucketCard
            bucket={item}
            onPress={() =>
              router.push({
                pathname: '/bucket/[name]',
                params: { name: item.name },
              })
            }
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon="search"
            title="Aucun cours trouvé"
            subtitle={search ? 'Essayez un autre terme de recherche' : 'Aucun bucket disponible'}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoEmoji: {
    fontSize: 32,
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  logoSub: {
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  list: {
    paddingBottom: 24,
  },
});
