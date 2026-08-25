import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { STADIA_API_KEY, TILE_STYLES } from '../lib/mapTiles';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface FarmMapProps {
  center?: Coordinate;
  zoom?: number;
  polygonCoordinates?: Coordinate[];
  polylineCoordinates?: Coordinate[];
  markers?: Array<{ coordinate: Coordinate; title?: string; color?: string }>;
  onPress?: (e: any) => void;
  showUserLocation?: boolean;
  userLocation?: Coordinate | null;
  styleURL?: 'streets' | 'satellite' | 'dark';
  polylines?: Array<{
    coordinates: Coordinate[];
    color?: string;
    width?: number;
  }>;
}

export default function FarmMap({
  center = { latitude: 6.5244, longitude: 3.3792 },
  zoom = 13,
  polygonCoordinates,
  polylineCoordinates,
  markers = [],
  onPress,
  showUserLocation = false,
  userLocation,
  styleURL = 'streets',
  polylines,
}: FarmMapProps) {
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const key = STADIA_API_KEY;
    if (key && key !== 'your-s...') {
      setApiKeyReady(true);
    }
  }, []);

  if (!apiKeyReady) {
    return (
      <View style={[styles.map, styles.placeholder]}>
        <View style={styles.placeholderContent}>
          <Text style={styles.placeholderTitle}>MapLibre — Setup Required</Text>
          <Text style={styles.placeholderText}>
            Add <Text style={styles.placeholderKey}>EXPO_PUBLIC_STADIA_API_KEY</Text> to mobile/.env
          </Text>
        </View>
      </View>
    );
  }

  const centerCoord = [center.longitude, center.latitude] as [number, number];

  return (
    <MapLibreGL.MapView
      style={styles.map}
      styleURL={TILE_STYLES[styleURL]}
      onMapReady={() => setMapReady(true)}
    >
      <MapLibreGL.Camera
        centerCoordinate={centerCoord}
        zoomLevel={zoom}
        animationMode="flyTo"
        animationDuration={1000}
      />

      {/* Boundary polygon fill */}
      {polygonCoordinates && polygonCoordinates.length >= 3 && (
        <MapLibreGL.ShapeSource
          id="farmBoundary"
          shape={{
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                polygonCoordinates.map((c) => [c.longitude, c.latitude]),
              ],
            },
            properties: {},
          }}
        >
          <MapLibreGL.FillLayer
            id="farmBoundaryFill"
            style={{
              fillColor: '#1a5632',
              fillOpacity: 0.3,
            }}
          />
          <MapLibreGL.LineLayer
            id="farmBoundaryOutline"
            style={{
              lineColor: '#1a4d2e',
              lineWidth: 2,
            }}
          />
        </MapLibreGL.ShapeSource>
      )}

      {/* Road polyline (legacy single) */}
      {polylineCoordinates && polylineCoordinates.length >= 2 && (
        <MapLibreGL.ShapeSource
          id="roadLine"
          shape={{
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: polylineCoordinates.map((c) => [c.longitude, c.latitude]),
            },
            properties: {},
          }}
        >
          <MapLibreGL.LineLayer
            id="roadLineLayer"
            style={{
              lineColor: '#e67e22',
              lineWidth: 4,
            }}
          />
        </MapLibreGL.ShapeSource>
      )}

      {/* Multiple polylines (for roads) */}
      {polylines && polylines.map((polyline, i) => (
        polyline.coordinates.length >= 2 ? (
          <MapLibreGL.ShapeSource
            key={`polyline-${i}`}
            id={`roadLine-${i}`}
            shape={{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: polyline.coordinates.map((c) => [c.longitude, c.latitude]),
              },
              properties: {},
            }}
          >
            <MapLibreGL.LineLayer
              id={`roadLineLayer-${i}`}
              style={{
                lineColor: polyline.color || '#e67e22',
                lineWidth: polyline.width || 3,
              }}
            />
          </MapLibreGL.ShapeSource>
        ) : null
      ))}

      {/* Static markers */}
      {markers.map((m, i) => (
        <MapLibreGL.PointAnnotation
          key={`marker-${i}`}
          id={`marker-${i}`}
          coordinate={[m.coordinate.longitude, m.coordinate.latitude]}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: m.color || '#1a4d2e',
              borderWidth: 2,
              borderColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#fff',
              }}
            />
          </View>
        </MapLibreGL.PointAnnotation>
      ))}

      {/* Live user position */}
      {showUserLocation && userLocation && (
        <MapLibreGL.PointAnnotation
          id="livePosition"
          coordinate={[userLocation.longitude, userLocation.latitude]}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#ff6b35',
              borderWidth: 3,
              borderColor: '#fff',
            }}
          />
        </MapLibreGL.PointAnnotation>
      )}
    </MapLibreGL.MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  placeholder: {
    backgroundColor: '#f0f0f0',
  },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a5632',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  placeholderKey: {
    fontWeight: 'bold',
    color: '#1a5632',
  },
});
