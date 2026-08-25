import { useState, useCallback, useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { STADIA_API_KEY, TILE_STYLES } from "../config/env";

const INITIAL_CENTER = [3.3792, 6.5244] as [number, number]; // [lng, lat] — Lagos

interface MarkerData {
  lat: number;
  lng: number;
  label: string;
}

const SAMPLE_MARKERS: MarkerData[] = [
  { lat: 6.5244, lng: 3.3792, label: "Sample Farm A" },
  { lat: 6.5344, lng: 3.3892, label: "Sample Farm B" },
  { lat: 6.5144, lng: 3.3692, label: "Sample Farm C" },
];

export default function MapTest() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [center, setCenter] = useState(INITIAL_CENTER);
  const [zoom, setZoom] = useState(13);
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);

  // Initialize the map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const apiKey = STADIA_API_KEY;
    if (!apiKey || apiKey === "your-stadia-api-key-here") {
      mapContainer.current.innerHTML = `
        <div class="flex items-center justify-center h-full bg-[#1a5632] text-white p-8">
          <div class="text-center">
            <p class="text-lg font-semibold mb-2">MapLibre — Setup Required</p>
            <p class="text-sm text-[#9dc9ae]">Add <code>VITE_STADIA_API_KEY</code> to web/.env</p>
          </div>
        </div>`;
      return;
    }

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: TILE_STYLES.satellite,
      center: INITIAL_CENTER,
      zoom: 13,
      attributionControl: true,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-left");

    // Add markers
    SAMPLE_MARKERS.forEach((m) => {
      const el = document.createElement("div");
      el.className = "cursor-pointer hover:scale-110 transition-transform";
      el.innerHTML = `
        <svg width="32" height="44" viewBox="0 0 32 44" fill="none">
          <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 28 16 28s16-16 16-28C32 7.16 24.84 0 16 0z" fill="#1a4d2e" stroke="#c8a96e" stroke-width="2" />
          <circle cx="16" cy="14" r="6" fill="#c8a96e" />
        </svg>`;
      el.addEventListener("click", () => {
        setSelectedMarker(m);
      });

      new maplibregl.Marker(el)
        .setLngLat([m.lng, m.lat])
        .setPopup(
          new maplibregl.Popup({ anchor: "top" }).setHTML(`
            <div class="text-sm">
              <p class="font-semibold text-[#1c1c1a]">${m.label}</p>
              <p class="text-[#5a5a57]">${m.lat.toFixed(2)}°N, ${m.lng.toFixed(2)}°E</p>
              <p class="text-[#1a4d2e] text-xs mt-1 font-medium">Tap to view details</p>
            </div>
          `)
        )
        .addTo(map.current!);
    });

    // Track center/zoom on move
    map.current.on("move", () => {
      const c = map.current!.getCenter();
      setCenter([c.lng, c.lat]);
      setZoom(map.current!.getZoom());
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
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
        <span className="text-xs text-[#9dc9ae]">MapLibre GL + Stadia Maps</span>
      </div>

      <div ref={mapContainer} className="flex-1 w-full h-full" />

      <div className="bg-white border-t px-4 py-2 text-xs text-[#5a5a57] flex justify-between items-center">
        <span>Zoom: {zoom.toFixed(1)}</span>
        <span>Center: {center[1].toFixed(4)}°, {center[0].toFixed(4)}°</span>
      </div>
    </div>
  );
}
