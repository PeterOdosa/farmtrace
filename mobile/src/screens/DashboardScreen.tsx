import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { getFarms } from '../services/api';
import { getCachedFarms, setCachedFarms, clearAllCache } from '../services/dataCache';
import { useSyncQueue, getSyncStatus } from '../services/syncQueue';
import { networkStatus } from '../services/connectionMonitor';
import { Button } from '../components';
import { colors } from '../config/colors';

interface Farm {
  id: string;
  name: string;
  crop_type?: string;
  area_hectares?: number;
  perimeter_km?: number;
  updated_at: string;
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuthStore();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const syncState = useSyncQueue();

  const fetchFarms = async (silent = false) => {
    const offline = !networkStatus.isConnected;

    if (offline && !silent) {
      // Load from cache when offline
      const cached = getCachedFarms();
      if (cached) {
        setFarms(cached);
        if (!silent) {
          Alert.alert(
            'Offline Mode',
            'Showing cached data. Changes will sync when connection is restored.',
            [{ text: 'OK' }]
          );
        }
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setFarms([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const farmsData = await getFarms();
      setFarms(farmsData);
      setCachedFarms(farmsData);
    } catch (err: any) {
      console.error('Failed to fetch farms:', err);
      // If API call failed (not due to network), try cache as fallback
      if (!silent) {
        const cached = getCachedFarms();
        if (cached) {
          setFarms(cached);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Initial load: check offline first
    fetchFarms(true);

    // Listen for connectivity changes
    const check = setInterval(() => {
      setIsOffline(!networkStatus.isConnected);
    }, 3000);

    return () => clearInterval(check);
  }, []);

  useFocusEffect(
    useCallback(() => {
      // On screen focus, try fresh data if online
      if (networkStatus.isConnected) {
        fetchFarms(true);
      }
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFarms(false);
  };

  const handleCreateFarm = () => {
    navigation.navigate('BoundaryMap', { mode: 'create' });
  };

  const handleEditBoundary = (farmId: string) => {
    navigation.navigate('BoundaryMap', { farmId, mode: 'edit' });
  };

  const handleViewFarm = (farm: Farm) => {
    navigation.navigate('FieldDetail', { farm });
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          navigation.navigate('Login');
        },
      },
    ]);
  };

  const renderFarmCard = ({ item }: { item: Farm }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleViewFarm(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cropBadge}>{item.crop_type || 'No crop'}</Text>
      </View>

      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.area_hectares?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.statLabel}>Hectares</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{item.perimeter_km?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.statLabel}>Perimeter (km)</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>Updated {new Date(item.updated_at).toLocaleDateString()}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEditBoundary(item.id);
            }}
          >
            <Text style={styles.editText}>Edit Map</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🗺️</Text>
      <Text style={styles.emptyTitle}>No farms yet</Text>
      <Text style={styles.emptySubtitle}>
        {isOffline ? 'You\'re offline. Create a farm when you\'re back online.' : 'Create your first farm to start mapping'}
      </Text>
      <View style={{ marginTop: 16 }}>
        <Button title="Create Farm" onPress={handleCreateFarm} variant="primary" />
      </View>
    </View>
  );

  const syncLabel = () => {
    if (isOffline) return '📴 Offline';
    if (syncState.status === 'pending') return `⚠️ ${syncState.pendingCount} pending`;
    if (syncState.status === 'syncing') return '🔄 Syncing...';
    return '✅ Synced';
  };

  const syncColor = () => {
    if (isOffline) return '#dc2626';
    if (syncState.status === 'pending') return '#ea580c';
    if (syncState.status === 'syncing') return '#2563eb';
    return '#16a34a';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header with sync indicator */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.email?.split('@')[0] ?? 'User'}</Text>
          <Text style={styles.headerSub}>Your Farms</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Sync status badge */}
          <View style={[styles.syncBadge, { borderColor: syncColor() }]}>
            <Text style={[styles.syncText, { color: syncColor() }]}>
              {syncLabel()}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            You're offline — data shown from cache. Changes will sync when online.
          </Text>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={farms}
          keyExtractor={(item) => item.id}
          renderItem={renderFarmCard}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateFarm}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  greeting: {
    fontSize: 14,
    color: colors.textLight,
  },
  headerSub: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  syncText: {
    fontSize: 11,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  offlineBanner: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#fbbf24',
  },
  offlineBannerText: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'center',
  },
  list: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  cropBadge: {
    fontSize: 12,
    color: colors.primary,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: '600',
  },
  cardStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 8,
  },
  stat: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textLight,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
});
