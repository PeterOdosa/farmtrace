import { useState, useCallback, useRef } from "react";
import MapGl, { Marker, Popup, NavigationControl, ScaleControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "../config/env";

const INITIAL_VIEW_STATE = {
  latitude: 6.5244,
  longitude: 3.3792,
  zoom: 13,
  bearing: 0,
  pitch: 0,
};

export default function MapTest() {
  const mapRef = useRef<MapGl>(null);
  const [viewport, setViewport] = useState(INITIAL_VIEW_STATE);
  const [selectedMarker, setSelectedMarker] = useState<{ lat: number; lng: number; label: string } | null>(null);

  const handleMarkerClick = useCallback((lat: number, lng: number, label: string) => {
    setSelectedMarker({ lat, lng, label });
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col">
      <div className="bg-[#0f3320] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[#1a4d2e] border border-[#2d7a4f] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L13 5.5V10.5L8 14L3 10.5V5.5L8 2Z" stroke="#c8a96e" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="8" cy="8" r="1.5" fill="#c8a96e" />
            </svg>
          </div>
          <span className="font-semibold text-sm">FarmTrace — Map Test</span>
        </div>
        <span className="text-xs text-[#9dc9ae]">Mapbox GL JS + React Map GL</span>
      </div>

      <MapGl
        ref={mapRef}
        {...viewport}
        onMove={(evt: any) => setViewport(evt.viewState)}
        style={{ width: "100%", height: "calc(100% - 48px)" }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        <NavigationControl position="top-left" />
        <ScaleControl unit="metric" />

        {[
          { lat: 6.5244, lng: 3.3792, label: "Sample Farm A" },
          { lat: 6.5344, lng: 3.3892, label: "Sample Farm B" },
          { lat: 6.5144, lng: 3.3692, label: "Sample Farm C" },
        ].map((m: any, i: number) => (
          <Marker
            key={i}
            latitude={m.lat}
            longitude={m.lng}
            onClick={(e: any) => {
              e.preventDefault();
              handleMarkerClick(m.lat, m.lng, m.label);
            }}
          >
            <div className="cursor-pointer hover:scale-110 transition-transform">
              <svg width="32" height="44" viewBox="0 0 32 44" fill="none">
                <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 28 16 28s16-16 16-28C32 7.16 24.84 0 16 0z" fill="#1a4d2e" stroke="#c8a96e" strokeWidth="2" />
                <circle cx="16" cy="14" r="6" fill="#c8a96e" />
              </svg>
            </div>
          </Marker>
        ))}

        {selectedMarker && (
          <Popup
            latitude={selectedMarker.lat}
            longitude={selectedMarker.lng}
            anchor="top"
            onClose={() => setSelectedMarker(null)}
          >
            <div className="text-sm">
              <p className="font-semibold text-[#1c1c1a]">{selectedMarker.label}</p>
              <p className="text-[#5a5a57]">6.52°N, 3.38°E</p>
              <p className="text-[#1a4d2e] text-xs mt-1 font-medium">Tap to view details</p>
            </div>
          </Popup>
        )}
      </MapGl>

      <div className="bg-white border-t px-4 py-2 text-xs text-[#5a5a57] flex justify-between items-center">
        <span>Zoom: {viewport.zoom?.toFixed(1)}</span>
        <span>Center: {viewport.latitude?.toFixed(4)}°, {viewport.longitude?.toFixed(4)}°</span>
      </div>
    </div>
  );
}
