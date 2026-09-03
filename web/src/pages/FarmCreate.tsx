import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createFarm } from "../services/api";
import { supabase } from "../lib/supabase";
import { STADIA_API_KEY, TILE_STYLES } from "../config/env";

// ─── Font loader ──────────────────────────────────────────────────────────────
function FontLoader() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);
  return null;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ParsedBoundary {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

type ImportStatus = "idle" | "loading" | "success" | "error";

// ─── GPS import parsers ───────────────────────────────────────────────────────
async function parseGeoJSON(file: File): Promise<ParsedBoundary> {
  const text = await file.text();
  const json = JSON.parse(text);

  // Handle FeatureCollection
  if (json.type === "FeatureCollection" && json.features.length > 0) {
    const geom = json.features[0].geometry;
    return { type: geom.type, coordinates: geom.coordinates };
  }

  // Handle direct geometry
  if (json.type === "Polygon" || json.type === "MultiPolygon") {
    return { type: json.type, coordinates: json.coordinates };
  }

  throw new Error("Invalid GeoJSON: expected Polygon, MultiPolygon, or FeatureCollection");
}

async function parseKML(file: File): Promise<ParsedBoundary> {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");

  const parseCoords = (coordsStr: string): [number, number][] => {
    return coordsStr.trim().split(/\s+/).map(pair => {
      const [lng, lat] = pair.split(",").map(Number);
      return [lat, lng]; // KML is lon,lat; we need lat,lng
    });
  };

  const parseLinearRing = (elem: Element): [number, number][] => {
    const coordEl = elem.querySelector("coord");
    if (coordEl) return parseCoords(coordEl.textContent || "");
    // Try nested <coordinates>
    const nested = elem.querySelector("coordinates");
    if (nested) return parseCoords(nested.textContent || "");
    return [];
  };

  const parsePolygon = (elem: Element): number[][][] => {
    const outer = elem.querySelector("outerBoundaryIs");
    if (!outer) throw new Error("KML: no outer boundary found");
    const linearRing = outer.querySelector("LinearRing");
    if (!linearRing) throw new Error("KML: no LinearRing in outer boundary");
    const coords = parseLinearRing(linearRing);
    coords.push(coords[0]); // close ring
    return [coords];
  };

  const placers = doc.querySelectorAll("Placemark");
  if (placers.length === 0) throw new Error("KML: no placemarks found");

  const first = placers[0];
  const polygon = first.querySelector("Polygon");
  if (polygon) return { type: "Polygon", coordinates: parsePolygon(polygon) };

  const multiPolygon = first.querySelector("MultiGeometry");
  if (multiPolygon) {
    const polygons = multiPolygon.querySelectorAll("Polygon");
    if (polygons.length > 0) {
      const coords: number[][][] = [];
      polygons.forEach(p => coords.push(...parsePolygon(p)));
      return { type: "MultiPolygon", coordinates: coords };
    }
  }

  throw new Error("KML: unsupported geometry type (expected Polygon)");
}

// ─── GPX parser ──────────────────────────────────────────────────────────────
async function parseGPX(file: File): Promise<ParsedBoundary> {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");

  // Try to find a track with coordinates
  const tracks = doc.querySelectorAll("trkseg");
  if (tracks.length > 0) {
    const coords: [number, number][] = [];
    // Use first track segment with coordinates
    for (const seg of tracks) {
      const trkpts = seg.querySelectorAll("trkpt");
      if (trkpts.length > 0) {
        for (const pt of trkpts) {
          const lat = parseFloat(pt.getAttribute("lat") || "0");
          const lon = parseFloat(pt.getAttribute("lon") || "0");
          coords.push([lon, lat]);
        }
      }
    }
    if (coords.length < 3) throw new Error("GPX: track has fewer than 3 points");
    // Close the ring
    coords.push(coords[0]);
    return { type: "Polygon", coordinates: [coords] };
  }

  // Try to find a route
  const routes = doc.querySelectorAll("rtept");
  if (routes.length > 0) {
    const coords: [number, number][] = [];
    for (const pt of routes) {
      const lat = parseFloat(pt.getAttribute("lat") || "0");
      const lon = parseFloat(pt.getAttribute("lon") || "0");
      coords.push([lon, lat]);
    }
    if (coords.length < 3) throw new Error("GPX: route has fewer than 3 points");
    coords.push(coords[0]);
    return { type: "Polygon", coordinates: [coords] };
  }

  // Try to find waypoints and create a polygon from them
  const waypoints = doc.querySelectorAll("wpt");
  if (waypoints.length >= 3) {
    const coords: [number, number][] = [];
    for (const pt of waypoints) {
      const lat = parseFloat(pt.getAttribute("lat") || "0");
      const lon = parseFloat(pt.getAttribute("lon") || "0");
      coords.push([lon, lat]);
    }
    coords.push(coords[0]);
    return { type: "Polygon", coordinates: [coords] };
  }

  throw new Error("GPX: no valid track, route, or waypoint group found (need 3+ points)");
}

// ─── Helper: calculate area from GeoJSON coordinates ──────────────────────────
function estimateAreaFromCoords(type: string, coords: number[][][] | number[][][][]): number | null {
  // Approximate area using simple shoelace for single polygon
  if (type === "Polygon" && coords.length > 0 && coords[0].length >= 3) {
    const ring = coords[0].slice(0, -1); // remove closing point
    let area = 0;
    for (let i = 0; i < ring.length; i++) {
      const j = (i + 1) % ring.length;
      area += ring[i][1] * ring[j][1]; // rough — actual PostGIS will be precise
      area -= ring[j][1] * ring[i][1];
    }
    // Very rough estimate in hectares (not accurate, just for preview)
    return null;
  }
  return null;
}

// ─── Helper: get center from coordinates ──────────────────────────────────────
function getCenterFromCoords(type: string, coords: number[][][] | number[][][][]): [number, number] {
  if (type === "Polygon" && coords.length > 0 && coords[0].length > 0) {
    const ring = coords[0];
    const avgLng = ring.reduce((s, p) => s + p[0], 0) / ring.length;
    const avgLat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
    return [avgLng, avgLat];
  }
  return [3.3792, 6.5244]; // default Lagos
}

// ─── Crop options ─────────────────────────────────────────────────────────────
const CROP_OPTIONS = [
  { value: "oil palm", label: "Oil Palm" },
  { value: "maize", label: "Maize" },
  { value: "cassava", label: "Cassava" },
  { value: "cocoa", label: "Cocoa" },
  { value: "rubber", label: "Rubber" },
  { value: "rice", label: "Rice" },
  { value: "soybean", label: "Soybean" },
  { value: "yams", label: "Yams" },
  { value: "vegetables", label: "Vegetables" },
  { value: null, label: "No crop" },
];

// ─── Create Farm Page ─────────────────────────────────────────────────────────
export default function FarmCreate() {
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [boundarySourceAdded, setBoundarySourceAdded] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [cropType, setCropType] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [importError, setImportError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;

    setImportStatus("loading");
    setImportError(null);
    setFileName(file.name);

    try {
      let boundary: ParsedBoundary;
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "gpx") {
        boundary = await parseGPX(file);
      } else if (ext === "geojson" || ext === "json") {
        boundary = await parseGeoJSON(file);
      } else if (ext === "kml") {
        boundary = await parseKML(file);
      } else {
        throw new Error(`Unsupported file format: .${ext}. Please upload a GeoJSON (.geojson), KML (.kml), or GPX (.gpx) file.`);
      }

      // Add boundary to map or create map
      const center = getCenterFromCoords(boundary.type, boundary.coordinates);

      if (!map.current) {
        initMap(boundary, center);
      } else {
        updateMapBoundary(boundary, center);
      }

      setImportStatus("success");
    } catch (err: any) {
      console.error("Import error:", err);
      setImportStatus("error");
      setImportError(err.message || "Failed to parse file.");
    }
  };

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // File input handler (unchanged, delegates to handleFileUpload)
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    handleFileUpload(file);
    // Reset input so same file can be re-uploaded
    e.target.value = "";
  };

  // Initialize or update map
  const initMap = (boundary: ParsedBoundary, center: [number, number]) => {
    if (!mapContainer.current) return;

    const apiKey = STADIA_API_KEY;
    if (!apiKey || apiKey === "your-stadia-api-key-here") {
      mapContainer.current.innerHTML = `<div class="flex items-center justify-center h-full bg-[#1a5632] text-white p-8"><div class="text-center"><p class="text-lg font-semibold mb-2">MapLibre — Setup Required</p><p class="text-sm text-[#9dc9ae]">Add VITE_STADIA_API_KEY to web/.env</p></div></div>`;
      return;
    }

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: TILE_STYLES.satellite,
      center: center,
      zoom: 14,
      attributionControl: true,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-left");

    // Add boundary
    map.current.on("load", () => {
      (map.current! as any).addSource("farm-boundary", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: boundary.type, coordinates: boundary.coordinates },
        },
      });

      (map.current! as any).addLayer({
        id: "farm-boundary-fill",
        type: "fill",
        source: "farm-boundary",
        paint: {
          "fill-color": "#2d7a4f",
          "fill-opacity": 0.3,
        },
      });

      (map.current! as any).addLayer({
        id: "farm-boundary-line",
        type: "line",
        source: "farm-boundary",
        paint: {
          "line-color": "#1a4d2e",
          "line-width": 3,
        },
      });

      setBoundarySourceAdded(true);

      // Fit bounds
      const geojson = (map.current! as any).getSource("farm-boundary")?.getGeoJSON();
      if (geojson && "features" in geojson) {
        const coords = (geojson as any).features[0].geometry.coordinates;
        const bounds = new maplibregl.LngLatBounds();
        const flatten = (ring: number[][]) => ring.forEach(([lng, lat]) => bounds.extend([lng, lat]));
        if (boundary.type === "Polygon") {
          flatten(coords[0]);
        } else {
          coords.forEach((poly: number[][][]) => poly.forEach(flatten));
        }
        map.current!.fitBounds(bounds, { padding: 60, maxZoom: 18 });
      }
    });
  };

  const updateMapBoundary = (boundary: ParsedBoundary, center: [number, number]) => {
    if (!map.current) return;

    if ((map.current as any).getSource("farm-boundary")) {
      (map.current as any).getSource("farm-boundary").setData({
        type: "Feature",
        geometry: { type: boundary.type, coordinates: boundary.coordinates },
      });
    } else {
      initMap(boundary, center);
      return;
    }

    // Re-fit bounds
    const geojson = (map.current as any).getSource("farm-boundary")?.getGeoJSON();
    if (geojson && "features" in geojson) {
      const coords = (geojson as any).features[0].geometry.coordinates;
      const bounds = new maplibregl.LngLatBounds();
      const flatten = (ring: number[][]) => ring.forEach(([lng, lat]) => bounds.extend([lng, lat]));
      if (boundary.type === "Polygon") {
        flatten(coords[0]);
      } else {
        coords.forEach((poly: number[][][]) => poly.forEach(flatten));
      }
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 18 });
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Save farm
  const handleSave = async () => {
    if (!name.trim()) {
      setImportError("Please enter a farm name.");
      return;
    }

    if (importStatus !== "success") {
      setImportError("Please upload and validate a GPS boundary file.");
      return;
    }

    setLoading(true);
    setImportError(null);

    try {
      // Read the uploaded file to get the full boundary for storage
      const fileInput = document.getElementById("gpsFile") as HTMLInputElement;
      const file = fileInput?.files?.[0];

      let boundaryGeom: any;

      if (file) {
        const text = await file.text();
        const ext = file.name.split(".").pop()?.toLowerCase();

        if (ext === "geojson" || ext === "json") {
          const json = JSON.parse(text);
          if (json.type === "FeatureCollection" && json.features.length > 0) {
            boundaryGeom = json.features[0].geometry;
          } else if (json.type === "Polygon" || json.type === "MultiPolygon") {
            boundaryGeom = json;
          }
        } else if (ext === "kml") {
          // For KML, we need to convert to GeoJSON polygon
          boundaryGeom = { type: "Polygon", coordinates: [] }; // Will be set from parsed coords
          // We'll use the boundary from the map source
          if (map.current && (map.current as any).getSource("farm-boundary")) {
            const geojson = (map.current as any).getSource("farm-boundary")?.getGeoJSON();
            if (geojson && geojson.type === "Feature") {
              boundaryGeom = geojson.geometry;
            }
          }
        }
      }

      // Fallback: try to get from map
      if (!boundaryGeom || !boundaryGeom.coordinates) {
        if (map.current && (map.current as any).getSource("farm-boundary")) {
          const geojson = (map.current as any).getSource("farm-boundary")?.getGeoJSON();
          if (geojson && geojson.type === "Feature") {
            boundaryGeom = geojson.geometry;
          }
        }
      }

      if (!boundaryGeom || !boundaryGeom.coordinates || boundaryGeom.coordinates.length === 0) {
        setImportError("No boundary data found. Please upload a valid GPS file.");
        setLoading(false);
        return;
      }

      await createFarm(name.trim(), cropType, boundaryGeom);

      navigate("/dashboard");
    } catch (err: any) {
      console.error("Create farm error:", err);
      setImportError(err.message || "Failed to create farm. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f5f0] font-sans">
      <FontLoader />

      {/* Top bar */}
      <header className="bg-[#0f3320] text-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="w-8 h-8 rounded-lg bg-[#1a4d2e] border border-[#2d7a4f] flex items-center justify-center hover:bg-[#2d7a4f] transition-colors"
            aria-label="Back to dashboard"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 2L3 7l6 5" stroke="#c8a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="text-sm font-semibold">Register new farm</h1>
        </div>

        <button
          onClick={handleSave}
          disabled={loading || importStatus !== "success" || !name.trim()}
          className="bg-[#1a4d2e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2d7a4f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Saving…
            </>
          ) : (
            "Save farm"
          )}
        </button>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar form */}
        <aside className="w-full md:w-80 bg-white border-r border-[#e4e4e0] flex flex-col overflow-y-auto shrink-0">
          <div className="p-5 flex flex-col gap-5">
            {/* Farm name */}
            <div>
              <label htmlFor="farmName" className="block text-xs font-medium text-[#3a3a38] mb-1.5">
                Farm name *
              </label>
              <input
                id="farmName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Adebayo's Oil Palm Estate"
                className="w-full bg-[#f7f5f0] border border-[#d8d8d4] rounded-lg px-3 py-2.5 text-sm text-[#1c1c1a] placeholder-[#b0b0ac] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent transition"
              />
            </div>

            {/* Crop type */}
            <div>
              <label htmlFor="cropType" className="block text-xs font-medium text-[#3a3a38] mb-1.5">
                Crop type
              </label>
              <select
                id="cropType"
                value={cropType ?? ""}
                onChange={(e) => setCropType(e.target.value || null)}
                className="w-full bg-[#f7f5f0] border border-[#d8d8d4] rounded-lg px-3 py-2.5 text-sm text-[#1c1c1a] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent transition capitalize"
              >
                {CROP_OPTIONS.map((opt) => (
                  <option key={opt.value ?? "none"} value={opt.value ?? ""} className="capitalize">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#e4e4e0]" />

            {/* GPS import */}
            <div>
              <h3 className="text-sm font-semibold text-[#1c1c1a] mb-2 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 1v8m0-8l-3 3m3-3l3 3M3 10v4a1 1 0 001 1h8a1 1 0 001-1v-4" stroke="#1a4d2e" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Import GPS boundary
              </h3>
              <p className="text-xs text-[#5a5a57] mb-3">Upload a GeoJSON, KML, or GPX file with your farm's GPS coordinates.</p>

              {/* File picker button */}
              <div className="flex flex-col items-center gap-3">
                <label
                  htmlFor="gpsFile"
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    importStatus === "success"
                      ? "bg-[#e8f0e9] text-[#1a4d2e] border border-[#2d7a4f]"
                      : importStatus === "error"
                      ? "bg-red-50 text-red-700 border border-red-200"
                      : "bg-[#1a4d2e] text-white hover:bg-[#2d7a4f]"
                  }`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 9v4a1 1 0 001 1h8a1 1 0 001-1v-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 2v6m0-6l-2 2m2-2l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M1 7h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  {importStatus === "loading" ? "Loading..." : importStatus === "idle" ? "Choose File" : "Change File"}
                </label>

                {/* File input - hidden, triggered by label click */}
                <input
                  id="gpsFile"
                  type="file"
                  accept=".geojson,.json,.kml,.gpx"
                  onChange={handleFileInputChange}
                  className="hidden"
                  aria-label="Upload GPS boundary file"
                />

                {/* Status display */}
                {importStatus === "loading" && (
                  <div className="flex items-center gap-2 text-xs text-[#1a4d2e]">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Parsing GPS data...
                  </div>
                )}

                {importStatus === "success" && fileName && (
                  <div className="flex flex-col items-center gap-1 text-xs">
                    <span className="font-medium text-[#1a4d2e]">{fileName}</span>
                    <span className="text-[#5a5a57]">Click "Change File" to upload another</span>
                  </div>
                )}

                {importStatus === "error" && (
                  <div className="text-xs text-red-600 text-center max-w-[200px]">
                    <p className="font-medium">Failed to parse file</p>
                    <p className="text-red-500">{importError}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Error message */}
            {importError && importStatus === "error" && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">
                {importError}
              </div>
            )}

            {/* Save button (also in sidebar) */}
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || importStatus !== "success" || !name.trim()}
              className="w-full bg-[#1a4d2e] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#2d7a4f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving…" : "Save & continue"}
            </button>
          </div>
        </aside>

        {/* Map */}
        <div className="flex-1 min-h-0">
          <div ref={mapContainer} className="w-full h-full" />
          {importStatus === "idle" && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#f7f5f0] pointer-events-none">
              <div className="text-center px-8">
                <div className="w-12 h-12 rounded-xl bg-[#e8f0e9] flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="#1a4d2e" strokeWidth="1.3" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="3" stroke="#1a4d2e" strokeWidth="1.3" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[#1c1c1a] mb-1">Upload a GPS file to get started</p>
                <p className="text-xs text-[#5a5a57]">Your boundary will appear here for preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
