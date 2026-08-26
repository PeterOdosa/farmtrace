import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FarmMap from '../components/FarmMap';
import * as Location from 'expo-location';
import type { LocationSubscription } from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createFarm, updateFarm } from '../services/api';
import { useConnectionMonitor, networkStatus } from '../services/connectionMonitor';
import { useSyncQueue } from '../services/syncQueue';
import { useDataCache, farmCache } from '../services/dataCache';
import { colors } from '../config/colors';

type Coordinate = { latitude: number; longitude: number };
type BoundaryMode = 'pin' | 'walk';

interface RouteParams {
  mode: 'create' | 'edit';
  farmId?: string;
  existingBoundary?: Coordinate[];
}

export default function BoundaryMapScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { mode: boundaryMode, farmId, existingBoundary }: RouteParams = route.params || { mode: 'create' };

  const watchSubscriptionRef = useRef<LocationSubscription | null>(null);

  const [coordinates, setCoordinates] = useState<Coordinate[]>(
    existingBoundary || []
  );
  const [mode, setMode] = useState<BoundaryMode>('pin');
  const [tracking, setTracking] = useState(false);
  const [pinModeActive, setPinModeActive] = useState(false);
  const [livePosition, setLivePosition] = useState<Coordinate | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [farmName, setFarmName] = useState('');
  const [cropType, setCropType] = useState('');
  const [measurements, setMeasurements] = useState({
    areaHectares: 0,
    perimeterKm: 0,
    areaAcres: 0,
    perimeterMiles: 0,
  });
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // Offline mode state
  const { isConnected, connectionType, hasChanged } = useConnectionMonitor();
  const { addSyncAction, queueLength, processQueue } = useSyncQueue();

  // Refresh data cache when connection changes
  useEffect(() => {
    if (isConnected && hasChanged) {
      // Auto-process queue on reconnect
      processQueue();
    }
  }, [isConnected, hasChanged, processQueue]);

  // Check location permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermissionsGranted(status === 'granted');
    if (status !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'This app needs location access to trace farm boundaries. Please enable it in settings.'
      );
    }
  };

  // Haversine distance between two points (km)
  const haversineDistance = (a: Coordinate, b: Coordinate): number => {
    const R = 6371; // Earth radius in km
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
    const al =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((a.latitude * Math.PI) / 180) *
        Math.cos((b.latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(al), Math.sqrt(1 - al));
    return R * c;
  };

  // Calculate polygon area using shoelace formula approximation
  const calculateAreaHectares = (coords: Coordinate[]): number => {
    if (coords.length < 3) return 0;

    let area = 0;
    const n = coords.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += coords[i].longitude * coords[j].latitude;
      area -= coords[j].longitude * coords[i].latitude;
    }
    area = Math.abs(area) / 2;

    // Convert to hectares (rough conversion based on latitude)
    const latRad = (coords[0].latitude * Math.PI) / 180;
    const metersPerDegree = 111320 * Math.cos(latRad);
    return area * metersPerDegree * metersPerDegree / 10000;
  };

  // Calculate perimeter
  const calculatePerimeter = (coords: Coordinate[]): number => {
    if (coords.length < 2) return 0;
    let perimeter = 0;
    const n = coords.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      perimeter += haversineDistance(coords[i], coords[j]);
    }
    return perimeter;
  };

  // Update measurements when coordinates change
  useEffect(() => {
    if (coordinates.length >= 3) {
      const areaHa = calculateAreaHectares(coordinates);
      const perimeterKm = calculatePerimeter(coordinates);
      setMeasurements({
        areaHectares: areaHa,
        perimeterKm,
        areaAcres: areaHa * 2.47105,
        perimeterMiles: perimeterKm * 0.621371,
      });
    } else {
      setMeasurements({ areaHectares: 0, perimeterKm: 0, areaAcres: 0, perimeterMiles: 0 });
    }
  }, [coordinates]);

  // Pin mode: start GPS tracking and show "Take Point" button
  const startPinTracking = async () => {
    if (!permissionsGranted) {
      Alert.alert('Permission Required', 'Please grant location access first.');
      return;
    }

    if (coordinates.length > 0) {
      Alert.alert(
        'Clear Points',
        'Starting pin mode will clear current points. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start',
            onPress: () => {
              setCoordinates([]);
              beginPinTracking();
            },
          },
        ]
      );
      return;
    }

    beginPinTracking();
  };

  const beginPinTracking = async () => {
    setPinModeActive(true);
    setMode('pin');
    setTracking(true);

    // Get initial position immediately
    const initialPosition = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    if (initialPosition) {
      const initialCoord: Coordinate = {
        latitude: initialPosition.coords.latitude,
        longitude: initialPosition.coords.longitude,
      };
      setLivePosition(initialCoord);
    }

    // Start continuous GPS tracking
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 0,
      },
      (location) => {
        const { latitude, longitude } = location.coords;
        setLivePosition({ latitude, longitude });
      }
    );
    watchSubscriptionRef.current = subscription;
  };

  // Pin mode: capture current GPS position (not map tap)
  const handleTakePoint = () => {
    if (!livePosition) {
      Alert.alert('GPS Not Ready', 'Waiting for GPS signal... Please wait a moment and try again.');
      return;
    }
    // Add current GPS position as a point
    setCoordinates((prev) => [...prev, { ...livePosition }]);
  };

  // Pin mode: remove last point
  const handleUndo = () => {
    setCoordinates((prev) => prev.slice(0, -1));
  };

  // Pin mode: finish tracking
  const handleFinishPin = () => {
    if (coordinates.length < 3) {
      Alert.alert('Not Enough Points', 'You need at least 3 points to form a polygon.');
      return;
    }
    Alert.alert(
      'Finish Pin Mode',
      `Captured ${coordinates.length} boundary points. Close the polygon and finish?`,
      [
        { text: 'Continue', style: 'cancel' },
        {
          text: 'Close & Finish',
          onPress: () => {
            stopPinTracking();
            // Close the polygon by adding the first point at the end
            if (coordinates.length > 0) {
              setCoordinates((prev) => [...prev, prev[0]]);
            }
          },
        },
      ]
    );
  };

  // Stop pin tracking
  const stopPinTracking = () => {
    if (watchSubscriptionRef.current) {
      watchSubscriptionRef.current.remove();
      watchSubscriptionRef.current = null;
    }
    setPinModeActive(false);
    setTracking(false);
    setLivePosition(null);
  };

  // Start GPS walk tracking
  const startWalkTracking = async () => {
    if (pinModeActive) {
      Alert.alert('Stop Pin Mode', 'Stop pin mode tracking first to switch to walk mode.');
      return;
    }

    if (!permissionsGranted) {
      Alert.alert('Permission Required', 'Please grant location access first.');
      return;
    }

    if (coordinates.length > 0) {
      Alert.alert(
        'Clear Points',
        'Starting walk mode will clear current points. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start',
            onPress: () => {
              setCoordinates([]);
              beginWalkTracking();
            },
          },
        ]
      );
      return;
    }

    beginWalkTracking();
  };

  const beginWalkTracking = async () => {
    setMode('walk');
    setTracking(true);

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 2000, // every 2 seconds
        distanceInterval: 3, // every 3 meters
      },
      (location) => {
        const { latitude, longitude } = location.coords;
        const newCoord: Coordinate = { latitude, longitude };
        setCoordinates((prev) => [...prev, newCoord]);
        setLivePosition(newCoord);

        // Auto-close if user returns near start (within 20m) and have enough points
        setCoordinates((coords) => {
          if (coords.length > 10) {
            const start = coords[0];
            if (haversineDistance(start, newCoord) < 0.02) {
              Alert.alert(
                'Back at Start',
                'You are near your starting point. Tap "Finish Mapping" to close the polygon.',
                [{ text: 'OK' }]
              );
            }
          }
          return coords;
        });
      }
    );
    watchSubscriptionRef.current = subscription;
  };

  // Stop GPS tracking
  const stopWalkTracking = () => {
    if (watchSubscriptionRef.current) {
      watchSubscriptionRef.current.remove();
      watchSubscriptionRef.current = null;
    }
    setTracking(false);
    setLivePosition(null);
  };

  const handleFinishWalk = () => {
    Alert.alert(
      'Finish Mapping',
      `Recorded ${coordinates.length} GPS points. Close the polygon?`,
      [
        { text: 'Continue Walking', style: 'cancel' },
        {
          text: 'Close & Finish',
          onPress: () => {
            stopWalkTracking();
            // Ensure polygon is closed (first point == last point)
            if (coordinates.length > 0) {
              setCoordinates((prev) => [...prev, prev[0]]);
            }
          },
        },
      ]
    );
  };

  // Save farm (online or queued for offline)
  const handleSave = async () => {
    if (coordinates.length < 4) {
      Alert.alert('Not Enough Points', 'Need at least 3 points to form a polygon (4 with closing point).');
      return;
    }

    if (!farmName.trim()) {
      Alert.alert('Name Required', 'Please give your farm a name.');
      return;
    }

    setSaving(true);

    try {
      // Convert to GeoJSON Polygon format for PostGIS
      const geoJSONPolygon = {
        type: 'Polygon' as const,
        coordinates: [
          coordinates.map((c) => [c.longitude, c.latitude]),
        ],
      };

      const payload = {
        name: farmName.trim(),
        crop_type: cropType.trim() || null,
        boundary: geoJSONPolygon,
      };

      if (!isConnected) {
        // Offline: queue the action with Supabase-compatible format
        addSyncAction({
          action: 'save-farm',
          table: 'farms',
          method: boundaryMode === 'create' ? 'insert' : 'update',
          payload,
          filter: boundaryMode === 'create' ? undefined : { id: farmId as string },
        });
        setSaving(false);
        setShowSaveModal(false);
        Alert.alert(
          'Saved Offline',
          'Farm saved locally. It will sync when you\'re back online.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Online: save directly
      if (boundaryMode === 'create') {
        await createFarm(payload.name, payload.crop_type ?? '', payload.boundary);
      } else if (farmId) {
        await updateFarm(farmId, {
          name: payload.name,
          crop_type: payload.crop_type ?? undefined,
          boundary: payload.boundary
        });
      }

      // Cache the result
      await farmCache.save(farmId ?? 'pending', payload);

      Alert.alert(
        'Saved!',
        boundaryMode === 'create' ? 'Farm created successfully.' : 'Farm updated successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save farm');
    } finally {
      setSaving(false);
      setShowSaveModal(false);
    }
  };

  // Calculate individual side lengths
  const sideLengths = coordinates.length >= 3
    ? (() => {
        const lengths: number[] = [];
        const n = coordinates.length - 1; // don't double-count closing point
        for (let i = 0; i < n; i++) {
          lengths.push(haversineDistance(coordinates[i], coordinates[i + 1]));
        }
        return lengths;
      })()
    : [];

  // Map center from live position, existing boundary, or default
  const mapCenter = livePosition
    ? livePosition
    : existingBoundary && existingBoundary.length >= 2
      ? {
          latitude: (Math.min(...existingBoundary.map(c => c.latitude)) + Math.max(...existingBoundary.map(c => c.latitude))) / 2,
          longitude: (Math.min(...existingBoundary.map(c => c.longitude)) + Math.max(...existingBoundary.map(c => c.longitude))) / 2,
        }
      : { latitude: 9.082, longitude: 7.3986 }; // Abuja

  // Boundary coordinates for rendering (without closing point)
  const boundaryCoords = coordinates.length >= 3
    ? coordinates.slice(0, -1) // Remove duplicate closing point for render
    : coordinates;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Map */}
      <FarmMap
        center={mapCenter}
        zoom={15}
        polygonCoordinates={boundaryCoords}
        polylineCoordinates={coordinates}
        markers={coordinates.map((coord, i) => ({
          coordinate: coord,
          color: i === 0 && coordinates.length >= 3 ? colors.success : colors.primary,
          title: `Pin ${i + 1}`,
        }))}
        showUserLocation={pinModeActive || mode === 'walk'}
        userLocation={livePosition}
        cameraFollow={livePosition}
        styleURL={mode === 'walk' ? 'satellite' : 'streets'}
      />

      {/* Offline indicator */}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineIcon}>📡</Text>
          <Text style={styles.offlineText}>Offline — changes will sync when reconnected</Text>
          {queueLength > 0 && (
            <View style={styles.queueBadge}>
              <Text style={styles.queueCount}>{queueLength}</Text>
            </View>
          )}
        </View>
      )}

      {/* Mode selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            (mode === 'pin' && !pinModeActive) && styles.modeButtonActive,
          ]}
          onPress={() => {
            if (mode === 'walk' && tracking) {
              Alert.alert('Stop Tracking', 'Stop walk tracking to switch modes.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Stop', onPress: () => { stopWalkTracking(); setMode('pin'); } },
              ]);
            } else if (pinModeActive) {
              Alert.alert('Stop Tracking', 'Stop pin mode tracking first.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Stop', onPress: () => { stopPinTracking(); setMode('pin'); } },
              ]);
            } else {
              setMode('pin');
            }
          }}
        >
          <Text
            style={[
              styles.modeButtonText,
              (mode === 'pin' && !pinModeActive) && styles.modeButtonTextActive,
            ]}
          >
            📍 Pin Mode
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeButton,
            mode === 'walk' && styles.modeButtonActive,
          ]}
          onPress={startWalkTracking}
        >
          <Text
            style={[
              styles.modeButtonText,
              mode === 'walk' && styles.modeButtonTextActive,
            ]}
          >
            🚶 Walk Mode
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pin Mode Controls */}
      {pinModeActive && (
        <View style={styles.pinModeControls}>
          {/* Pin counter */}
          <View style={styles.pinCounter}>
            <Text style={styles.pinCounterText}>
              {coordinates.length} point{coordinates.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Take Point button */}
          <TouchableOpacity
            style={[styles.takePointButton, !livePosition && styles.takePointButtonDisabled]}
            onPress={handleTakePoint}
            disabled={!livePosition}
          >
            {livePosition ? (
              <Text style={styles.takePointText}>📍 Take Point</Text>
            ) : (
              <ActivityIndicator color="#fff" />
            )}
          </TouchableOpacity>

          {/* Undo and Finish buttons */}
          <View style={styles.pinActionButtons}>
            <TouchableOpacity
              style={styles.undoButton}
              onPress={handleUndo}
              disabled={coordinates.length === 0}
            >
              <Text style={styles.undoText}>↩ Undo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.finishButton, coordinates.length < 3 && styles.finishButtonDisabled]}
              onPress={handleFinishPin}
              disabled={coordinates.length < 3}
            >
              <Text style={styles.finishText}>✓ Finish</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopPinTracking}
            >
              <Text style={styles.stopButtonText}>⏹ Stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tracking status (walk mode) */}
      {tracking && mode === 'walk' && (
        <View style={styles.trackingBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.trackingText}>Recording GPS...</Text>
          <Text style={styles.trackingPoints}>
            {coordinates.length} points
          </Text>
          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleFinishWalk}
          >
            <Text style={styles.stopButtonText}>Finish Mapping</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Start Pin Mode prompt */}
      {mode === 'pin' && !pinModeActive && !tracking && (
        <View style={styles.startPrompt}>
          <Text style={styles.startPromptText}>Tap "Take Point" button to capture GPS points</Text>
          <TouchableOpacity style={styles.startButton} onPress={startPinTracking}>
            <Text style={styles.startButtonText}>▶ Start Pin Mode</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Measurements panel */}
      {coordinates.length >= 3 && !pinModeActive && (
        <View style={styles.measurementsPanel}>
          <View style={styles.measurementRow}>
            <Text style={styles.measurementValue}>
              {measurements.areaHectares.toFixed(2)}
            </Text>
            <Text style={styles.measurementLabel}>Hectares</Text>
          </View>
          <View style={styles.measurementRow}>
            <Text style={styles.measurementValue}>
              {measurements.areaAcres.toFixed(1)}
            </Text>
            <Text style={styles.measurementLabel}>Acres</Text>
          </View>
          <View style={styles.measurementRow}>
            <Text style={styles.measurementValue}>
              {measurements.perimeterKm.toFixed(2)}
            </Text>
            <Text style={styles.measurementLabel}>Perimeter (km)</Text>
          </View>
          <TouchableOpacity
            style={styles.undoButton}
            onPress={handleUndo}
            disabled={tracking}
          >
            <Text style={styles.undoText}>Undo Last</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Save button */}
      {coordinates.length >= 4 && !tracking && (
        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => setShowSaveModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>💾 Save Farm</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Side lengths */}
      {coordinates.length >= 4 && sideLengths.length > 0 && !tracking && (
        <View style={styles.sideLengthsPanel}>
          <Text style={styles.sideLengthsTitle}>Side Lengths</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sideLengths.map((len, i) => (
              <View key={i} style={styles.sideLengthBadge}>
                <Text style={styles.sideLengthValue}>
                  {len.toFixed(0)}m
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Save modal */}
      <Modal visible={showSaveModal} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {boundaryMode === 'create' ? 'Create Farm' : 'Update Farm'}
            </Text>

            <Text style={styles.label}>Farm Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Family Farm, North Field"
              value={farmName}
              onChangeText={setFarmName}
              autoFocus
            />

            <Text style={styles.label}>Crop Type</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Maize, Cassava, Oil Palm"
              value={cropType}
              onChangeText={setCropType}
            />

            <View style={styles.modalMeasurements}>
              <Text style={styles.modalMeasText}>
                📐 {measurements.areaHectares.toFixed(2)} ha
              </Text>
              <Text style={styles.modalMeasText}>
                📏 {measurements.perimeterKm.toFixed(2)} km perimeter
              </Text>
              <Text style={styles.modalMeasText}>
                📍 {coordinates.length - 1} boundary points
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSave,
                  saving && styles.modalButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  modeSelector: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  modeButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  // Pin Mode Controls
  pinModeControls: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 20,
    gap: 12,
  },
  pinCounter: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pinCounterText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  takePointButton: {
    backgroundColor: colors.success,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  takePointButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  takePointText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  pinActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  finishButton: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  finishButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  finishText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Tracking status
  trackingBanner: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 107, 53, 0.95)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 10,
  },
  trackingText: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  trackingPoints: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  stopButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  stopButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  // Start prompt
  startPrompt: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 15,
  },
  startPromptText: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 12,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Measurements panel
  measurementsPanel: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  measurementRow: {
    alignItems: 'center',
  },
  measurementValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  measurementLabel: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  undoButton: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  undoText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
  // Save button
  saveContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Side lengths
  sideLengthsPanel: {
    position: 'absolute',
    bottom: 140,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    padding: 10,
  },
  sideLengthsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 6,
  },
  sideLengthBadge: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
  },
  sideLengthValue: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalMeasurements: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 4,
  },
  modalMeasText: {
    fontSize: 13,
    color: colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f1f5f9',
  },
  modalButtonSave: {
    backgroundColor: colors.primary,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalButtonTextSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Offline indicator
  offlineBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(245, 158, 11, 0.95)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  offlineIcon: {
    fontSize: 16,
  },
  offlineText: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  queueBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  queueCount: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});
