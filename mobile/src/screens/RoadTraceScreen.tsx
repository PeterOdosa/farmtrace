import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polygon, Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import type { LocationSubscription } from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createRoad } from '../services/api';
import { useConnectionMonitor, networkStatus } from '../services/connectionMonitor';
import { useSyncQueue } from '../services/syncQueue';
import { useDataCache } from '../services/dataCache';
import { colors } from '../config/colors';
interface Coordinate {
  latitude: number;
  longitude: number;
}

interface RouteParams {
  farmId: string;
  boundary: Coordinate[];
  mode: 'draw' | 'walk';
}

export default function RoadTraceScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { farmId, boundary, mode }: RouteParams = route.params;

  const mapRef = useRef<MapView>(null);
  const watchSubscriptionRef = useRef<LocationSubscription | null>(null);

  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [tracking, setTracking] = useState(false);
  const [livePosition, setLivePosition] = useState<Coordinate | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [roadName, setRoadName] = useState('');
  const [lengthKm, setLengthKm] = useState(0);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // Offline mode state
  const { isConnected, hasChanged } = useConnectionMonitor();
  const { addSyncAction, processQueue } = useSyncQueue();

  // Auto-process queue on reconnect
  useEffect(() => {
    if (isConnected && hasChanged) {
      processQueue();
    }
  }, [isConnected, hasChanged, processQueue]);

  useEffect(() => {
    checkPermissions();
    // Fit map to farm boundary
    if (boundary.length >= 2 && mapRef.current) {
      const lats = boundary.map((c) => c.latitude);
      const lngs = boundary.map((c) => c.longitude);
      mapRef.current.animateToRegion(
        {
          latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
          longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
          latitudeDelta: Math.max((Math.max(...lats) - Math.min(...lats)) * 1.3, 0.02),
          longitudeDelta: Math.max((Math.max(...lngs) - Math.min(...lngs)) * 1.3, 0.02),
        },
        1000
      );
    }
  }, []);

  const checkPermissions = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermissionsGranted(status === 'granted');
  };

  const haversineDistance = (a: Coordinate, b: Coordinate): number => {
    const R = 6371;
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
    const al =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((a.latitude * Math.PI) / 180) *
        Math.cos((b.latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(al), Math.sqrt(1 - al));
  };

  useEffect(() => {
    if (coordinates.length >= 2) {
      let total = 0;
      for (let i = 0; i < coordinates.length - 1; i++) {
        total += haversineDistance(coordinates[i], coordinates[i + 1]);
      }
      setLengthKm(total);
    } else {
      setLengthKm(0);
    }
  }, [coordinates]);

  const handleMapPress = (e: any) => {
    if (tracking) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setCoordinates((prev) => [...prev, { latitude, longitude }]);
  };

  const handleUndo = () => {
    setCoordinates((prev) => prev.slice(0, -1));
  };

  const startWalk = async () => {
    if (!permissionsGranted) {
      Alert.alert('Permission Required', 'Please grant location access.');
      return;
    }
    if (coordinates.length > 0) {
      Alert.alert(
        'Clear Points',
        'Start walk mode will clear current points.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start',
            onPress: () => {
              setCoordinates([]);
              beginTracking();
            },
          },
        ]
      );
      return;
    }
    beginTracking();
  };

  const beginTracking = async () => {
    setTracking(true);
    const subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 2000, distanceInterval: 3 },
      (location) => {
        const { latitude, longitude } = location.coords;
        setCoordinates((prev) => [...prev, { latitude, longitude }]);
        setLivePosition({ latitude, longitude });
      }
    );
    watchSubscriptionRef.current = subscription;
  };

  const stopWalk = () => {
    if (watchSubscriptionRef.current) {
      watchSubscriptionRef.current.remove();
      watchSubscriptionRef.current = null;
    }
    setTracking(false);
    setLivePosition(null);
  };

  const handleFinish = () => {
    if (coordinates.length < 2) {
      Alert.alert('Not Enough Points', 'Need at least 2 points to form a road.');
      return;
    }
    setShowSaveModal(true);
  };

  // Save road (online or queued for offline)
  const handleSave = async () => {
    if (!roadName.trim()) {
      Alert.alert('Name Required', 'Give your road a name.');
      return;
    }

    setSaving(true);

    try {
      const geoJSONLineString = {
        type: 'LineString' as const,
        coordinates: coordinates.map((c) => [c.longitude, c.latitude]),
      };

      const payload = {
        label: roadName.trim(),
        path: geoJSONLineString,
      };

      if (!isConnected) {
        // Offline: queue the action with Supabase-compatible format
        addSyncAction({
          action: 'save-road',
          table: 'roads',
          method: 'insert',
          payload,
          filter: undefined,
        });
        setSaving(false);
        setShowSaveModal(false);
        Alert.alert(
          'Saved Offline',
          'Road saved locally. It will sync when you\'re back online.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Online: save directly
      await createRoad(farmId, payload.label, payload.path);

      Alert.alert(
        'Saved!',
        `Road "${roadName.trim()}" saved (${lengthKm.toFixed(2)} km).`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save road');
    } finally {
      setSaving(false);
      setShowSaveModal(false);
    }
  };

  const initialRegion =
    boundary.length >= 2
      ? {
          latitude: (Math.min(...boundary.map((c) => c.latitude)) + Math.max(...boundary.map((c) => c.latitude))) / 2,
          longitude: (Math.min(...boundary.map((c) => c.longitude)) + Math.max(...boundary.map((c) => c.longitude))) / 2,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }
      : {
          latitude: 9.082,
          longitude: 7.3986,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onPress={handleMapPress}
        showsUserLocation={tracking}
        followsUserLocation={tracking}
        mapType={tracking ? 'satellite' : 'standard'}
      >
        {/* Farm boundary (faded) */}
        {boundary.length >= 3 && (
          <Polygon
            coordinates={boundary.slice(0, -1)}
            fillColor="rgba(26, 86, 50, 0.15)"
            strokeColor={colors.primary}
            strokeWidth={1}
          />
        )}

        {/* Road polyline */}
        {coordinates.length >= 2 && (
          <Polyline
            coordinates={coordinates}
            strokeColor="#e67e22"
            strokeWidth={4}
          />
        )}

        {/* GPS dot */}
        {livePosition && (
          <Marker coordinate={livePosition} title="You" pinColor="#ff6b35" />
        )}

        {/* Points */}
        {coordinates.map((coord, i) => (
          <Marker key={i} coordinate={coord} pinColor={i === 0 ? colors.success : '#e67e22'} />
        ))}
      </MapView>

      {/* Mode indicator */}
      <View style={styles.modeBanner}>
        <Text style={styles.modeText}>
          {mode === 'walk' ? '🚶 Walk Mode' : '📍 Tap to Place Points'}
        </Text>
      </View>

      {/* Offline indicator */}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineIcon}>📡</Text>
          <Text style={styles.offlineText}>Offline — changes will sync when reconnected</Text>
        </View>
      )}

      {/* Tracking banner */}
      {tracking && (
        <View style={styles.trackingBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.trackingText}>Recording GPS...</Text>
          <Text style={styles.trackingPoints}>
            {coordinates.length} points · {lengthKm.toFixed(2)} km
          </Text>
          <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
            <Text style={styles.finishButtonText}>Finish Road</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Controls */}
      {!tracking && (
        <View style={styles.controlsBar}>
          <TouchableOpacity
            style={[styles.controlButton, styles.walkButton]}
            onPress={startWalk}
          >
            <Text style={styles.controlButtonText}>🚶 Walk Road</Text>
          </TouchableOpacity>

          {coordinates.length > 0 && (
            <>
              <View style={styles.lengthDisplay}>
                <Text style={styles.lengthText}>{lengthKm.toFixed(2)} km</Text>
              </View>
              <TouchableOpacity style={styles.undoButton} onPress={handleUndo}>
                <Text style={styles.undoText}>Undo</Text>
              </TouchableOpacity>
              {coordinates.length >= 2 && (
                <TouchableOpacity style={styles.saveButton} onPress={handleFinish}>
                  <Text style={styles.saveButtonText}>Save Road</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}

      {/* Save modal */}
      <Modal visible={showSaveModal} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Save Road</Text>

            <Text style={styles.label}>Road Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Main entrance road, Irrigation path"
              value={roadName}
              onChangeText={setRoadName}
              autoFocus
            />

            <View style={styles.modalMeasurements}>
              <Text style={styles.modalMeasText}>📏 {lengthKm.toFixed(2)} km</Text>
              <Text style={styles.modalMeasText}>📍 {coordinates.length} points</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave, saving && styles.modalButtonDisabled]}
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
  safeArea: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1 },
  modeBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  modeText: { fontSize: 14, fontWeight: '600', color: colors.text },
  trackingBanner: {
    position: 'absolute',
    top: 64,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 107, 53, 0.95)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trackingText: { flex: 1, color: '#fff', fontWeight: '600', fontSize: 14 },
  trackingPoints: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  finishButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  finishButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  controlsBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  controlButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  walkButton: { backgroundColor: '#fff' },
  controlButtonText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  lengthDisplay: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  lengthText: { fontSize: 14, fontWeight: 'bold', color: colors.primary },
  undoButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  undoText: { fontSize: 13, color: colors.error, fontWeight: '600' },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  saveButtonText: { fontSize: 13, color: '#fff', fontWeight: '700' },
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
  modalMeasText: { fontSize: 13, color: colors.text },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonCancel: { backgroundColor: '#f1f5f9' },
  modalButtonSave: { backgroundColor: colors.primary },
  modalButtonDisabled: { opacity: 0.6 },
  modalButtonTextCancel: { fontSize: 16, fontWeight: '600', color: colors.text },
  modalButtonTextSave: { fontSize: 16, fontWeight: '600', color: '#fff' },
  // Offline indicator
  offlineBanner: {
    position: 'absolute',
    top: 56,
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
  offlineIcon: { fontSize: 16 },
  offlineText: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
