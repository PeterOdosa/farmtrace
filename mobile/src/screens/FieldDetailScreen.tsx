import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Polygon, Marker, Polyline } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getRoads } from '../services/api';
import { colors } from '../config/colors';
import { getCachedFarm, setCachedFarm, getCachedRoads, setCachedRoads } from '../services/dataCache';
import { networkStatus } from '../services/connectionMonitor';
import { useSyncQueue } from '../services/syncQueue';
import * as Location from 'expo-location';

interface RouteParams {
  farm: {
    id: string;
    name: string;
    crop_type: string;
    area_hectares: number;
    perimeter_km: number;
    updated_at: string;
    boundary?: any;
  };
}

type Layer = 'boundary' | 'roads' | 'planned_layout' | 'live_position';

export default function FieldDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { farm }: RouteParams = route.params || {};

  const mapRef = useRef<MapView>(null);

  const [loading, setLoading] = useState(true);
  const [roads, setRoads] = useState<any[]>([]);
  const [layers, setLayers] = useState<Record<Layer, boolean>>({
    boundary: true,
    roads: true,
    planned_layout: false,
    live_position: false,
  });
  const [livePosition, setLivePosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const syncInfo = useSyncQueue();

  // Parse boundary from API response
  const boundaryCoords = farm?.boundary
    ? (farm.boundary.coordinates?.[0] || []).map(
        (c: [number, number]) => ({
          latitude: c[1],
          longitude: c[0],
        })
      )
    : [];

  // Parse boundary as GeoJSON polygon for rendering
  const geoJSONBoundary =
    boundaryCoords.length >= 3
      ? {
          type: 'Polygon' as const,
          coordinates: [boundaryCoords.map((c: any) => [c.longitude, c.latitude])],
        }
      : null;

  // Fit map to boundary
  useEffect(() => {
    if (boundaryCoords.length >= 2 && mapRef.current) {
      const lats = boundaryCoords.map((c: any) => c.latitude);
      const lngs = boundaryCoords.map((c: any) => c.longitude);
      mapRef.current.animateToRegion(
        {
          latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
          longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
          latitudeDelta: Math.max((Math.max(...lats) - Math.min(...lats)) * 1.2, 0.01),
          longitudeDelta: Math.max((Math.max(...lngs) - Math.min(...lngs)) * 1.2, 0.01),
        },
        1000
      );
    }
  }, [farm]);

  // Fetch roads with offline fallback
  useEffect(() => {
    const fetchRoads = async () => {
      if (!farm?.id) return;

      // Try cache first
      const cachedRoads = getCachedRoads(farm.id);
      if (cachedRoads) {
        setRoads(cachedRoads);
      }

      if (networkStatus.isConnected) {
        try {
          const roadsData = await getRoads(farm.id);
          setRoads(roadsData);
          setCachedRoads(farm.id, roadsData.map((r) => ({
            ...r,
            label: r.label ?? '',
            length_km: r.length_km ?? 0,
          })));
        } catch {
          // API failed — keep cached roads if available
          const cached = getCachedRoads(farm.id);
          if (cached) setRoads(cached);
        }
      } else {
        // Offline — show cached roads
        const cached = getCachedRoads(farm.id);
        if (cached) setRoads(cached);
      }

      setLoading(false);
    };

    fetchRoads();

    // Check for connectivity changes
    const interval = setInterval(() => {
      setIsOffline(!networkStatus.isConnected);
    }, 3000);

    return () => clearInterval(interval);
  }, [farm?.id]);

  // Live positioning
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    if (layers.live_position) {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        subscription = await Location.watchPositionAsync(
          { accuracy: 4, timeInterval: 3000, distanceInterval: 5 },
          (loc) => {
            setLivePosition({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        );
      })();
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [layers.live_position, farm?.id]);

  const toggleLayer = (layer: Layer) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleAddRoad = () => {
    navigation.navigate('RoadTrace', {
      farmId: farm.id,
      boundary: boundaryCoords,
      mode: 'draw' as const,
    });
  };

  const handleEditBoundary = () => {
    navigation.navigate('BoundaryMap', {
      farmId: farm.id,
      mode: 'edit',
      existingBoundary: boundaryCoords,
    });
  };

  if (!farm) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.errorText}>No farm data available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.farmName}>{farm.name}</Text>
          <Text style={styles.farmMeta}>
            {farm.crop_type || 'No crop type'} · Updated{' '}
            {new Date(farm.updated_at).toLocaleDateString()}
          </Text>
          {isOffline && (
            <Text style={styles.offlineHint}>📴 Showing cached data</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {/* Sync status */}
          {syncInfo.pendingCount > 0 && (
            <View style={[styles.syncBadge, { borderColor: '#ea580c' }]}>
              <Text style={[styles.syncText, { color: '#ea580c' }]}>
                {syncInfo.pendingCount} pending
              </Text>
            </View>
          )}
          <TouchableOpacity onPress={handleEditBoundary} style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit Map</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{farm.area_hectares?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.statLabel}>Hectares</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{farm.perimeter_km?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.statLabel}>Km Perimeter</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{roads.length}</Text>
          <Text style={styles.statLabel}>Roads</Text>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          mapType={layers.live_position ? 'satellite' : 'standard'}
        >
          {/* Boundary */}
          {layers.boundary && geoJSONBoundary && (
            <Polygon
              coordinates={boundaryCoords}
              fillColor="rgba(26, 86, 50, 0.3)"
              strokeColor={colors.primary}
              strokeWidth={2}
            />
          )}

          {/* Roads */}
          {layers.roads &&
            roads.map((road) => {
              const coords = road.path?.coordinates?.map(
                (c: [number, number]) => ({
                  latitude: c[1],
                  longitude: c[0],
                })
              );
              return coords && coords.length >= 2 ? (
                <Polyline
                  key={road.id}
                  coordinates={coords}
                  strokeColor="#e67e22"
                  strokeWidth={3}
                />
              ) : null;
            })}

          {/* Live position */}
          {layers.live_position && livePosition && (
            <Marker coordinate={livePosition} title="You" pinColor="#ff6b35" />
          )}
        </MapView>

        {/* Layer toggles */}
        <View style={styles.layerToggles}>
          {(['boundary', 'roads', 'live_position'] as Layer[]).map((layer) => (
            <TouchableOpacity
              key={layer}
              style={[
                styles.layerButton,
                layers[layer] && styles.layerButtonActive,
              ]}
              onPress={() => toggleLayer(layer)}
            >
              <Text
                style={[
                  styles.layerButtonText,
                  layers[layer] && styles.layerButtonTextActive,
                ]}
              >
                {layer === 'boundary'
                  ? '🔲 Boundary'
                  : layer === 'roads'
                  ? '🛤️ Roads'
                  : layer === 'live_position'
                  ? '📍 Live'
                  : '📐 Layout'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Roads list */}
      <ScrollView style={styles.roadsSection}>
        <View style={styles.roadsHeader}>
          <Text style={styles.roadsTitle}>Roads</Text>
          <TouchableOpacity onPress={handleAddRoad}>
            <Text style={styles.addRoadText}>+ Add Road</Text>
          </TouchableOpacity>
        </View>

        {roads.length === 0 ? (
          <View style={styles.emptyRoads}>
            <Text style={styles.emptyRoadsText}>No roads traced yet.</Text>
          </View>
        ) : (
          roads.map((road) => (
            <View key={road.id} style={styles.roadItem}>
              <Text style={styles.roadName}>{road.label || 'Unnamed Road'}</Text>
              <Text style={styles.roadLength}>
                {(road.length_km || 0).toFixed(2)} km
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  farmName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  farmMeta: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2,
  },
  offlineHint: {
    fontSize: 11,
    color: '#ea580c',
    marginTop: 2,
    fontWeight: '600',
  },
  headerActions: {
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
    fontSize: 10,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  layerToggles: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  layerButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  layerButtonActive: {
    backgroundColor: colors.primary,
  },
  layerButtonText: {
    fontSize: 12,
    color: colors.text,
  },
  layerButtonTextActive: {
    color: '#fff',
  },
  roadsSection: {
    maxHeight: 200,
    backgroundColor: colors.surface,
  },
  roadsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  roadsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  addRoadText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyRoads: {
    padding: 20,
    alignItems: 'center',
  },
  emptyRoadsText: {
    fontSize: 14,
    color: colors.textLight,
  },
  roadItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  roadName: {
    fontSize: 14,
    color: colors.text,
  },
  roadLength: {
    fontSize: 13,
    color: colors.textLight,
  },
});
