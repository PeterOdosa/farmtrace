import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, UIManager, Platform } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { TILE_STYLES } from '../lib/mapTiles';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

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
  onPress?: (coordinate: Coordinate) => void;
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
  const mapRef = useRef<any>(null);
  const [mapLayout, setMapLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const centerCoord = [center.longitude, center.latitude] as [number, number];

  const handleMapPress = useCallback((e: any) => {
    if (!onPress || !mapRef.current) return;
    const { pageX, pageY } = e.nativeEvent;
    try {
      const point = { x: pageX - mapLayout.x, y: pageY - mapLayout.y };
      const coord = mapRef.current.coordinateForPoint(point);
      if (coord) {
        onPress(coord);
      }
    } catch (err) {
      console.warn('[FarmMap] coordinateForPoint failed:', err);
      onPress(center);
    }
  }, [onPress, mapLayout, center]);

  return (
    <View style={styles.container} onLayout={(e) => setMapLayout(e.nativeEvent.layout)}>
      {/* Transparent overlay for tap handling */}
      {onPress && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleMapPress}
          pointerEvents="box-none"
        />
      )}

      <MapLibreGL.MapView
        ref={mapRef}
        style={styles.map}
        mapStyle={TILE_STYLES[styleURL]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
});
