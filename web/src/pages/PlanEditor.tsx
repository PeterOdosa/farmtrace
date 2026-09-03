import { useState, useCallback, useRef, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase, Farm, FarmPlan } from "../lib/supabase";
import { TILE_STYLES, STADIA_API_KEY } from "../config/env";
import { getFarm, getPlan, updatePlanElements, updatePlanMetadata } from "../services/api";

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

// ─── Element types ────────────────────────────────────────────────────────────
type ElementType = "zone" | "path" | "marker";

interface PlanElement {
  id: string;
  type: ElementType;
  label: string;
  color: string;
  geometry: any;
}

// ─── Element color presets ────────────────────────────────────────────────────
const ZONE_COLORS = [
  "#2d7a4f", "#4a9e6f", "#7bc49a", "#1a4d2e",
  "#f5c542", "#e88d31", "#d45d4a", "#6b8cce",
];

const PATH_COLORS = [
  "#c8a96e", "#a0845c", "#8b7355", "#d4a574",
];

const MARKER_COLORS = [
  "#e53935", "#1e88e5", "#43a047", "#fdd835",
  "#8e24aa", "#00acc1", "#fb8c00", "#6d4c41",
];

// ─── Drawing tool icons ───────────────────────────────────────────────────────
const toolIcons: Record<ElementType, string> = {
  zone: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 3h10v10H3z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 6h4M6 8.5h4M6 11h2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  ),
  path: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 12L6 4l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  marker: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2C5.2 2 3 4.2 3 7c0 4 5 7 5 7s5-3 5-7c0-2.8-2.2-5-5-5z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="7" r="1.5" fill="currentColor" />
    </svg>
  ),
};

const toolLabels: Record<ElementType, string> = {
  zone: "Draw Zone",
  path: "Draw Path",
  marker: "Place Marker",
};

// ─── Status helpers ───────────────────────────────────────────────────────────
const statusConfig = {
  draft: { color: "bg-gray-100 text-gray-600", label: "Draft" },
  active: { color: "bg-green-100 text-green-700", label: "Active" },
  completed: { color: "bg-amber-100 text-amber-700", label: "Completed" },
};

// ─── Plan Editor ──────────────────────────────────────────────────────────────
export default function PlanEditor() {
  const { farmId, planId } = useParams<{ farmId: string; planId: string }>();
  const navigate = useNavigate();

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const mapLoaded = useRef(false);

  const [farm, setFarm] = useState<Farm | null>(null);
  const [plan, setPlan] = useState<FarmPlan | null>(null);
  const [elements, setElements] = useState<PlanElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsaved, setUnsaved] = useState(false);

  // Drawing state
  const [tool, setTool] = useState<ElementType | null>(null);
  const [drawingCoords, setDrawingCoords] = useState<number[][]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [hoverElementId, setHoverElementId] = useState<string | null>(null);

  // Editing label for selected element
  const [editLabel, setEditLabel] = useState("");
  const [editColor, setEditColor] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Layer visibility toggles
  const [layerVisibility, setLayerVisibility] = useState({
    zones: true,
    paths: true,
    markers: true,
  });

  // Plan metadata editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");

  // ── Load farm + plan ─────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!farmId || !planId) return;
      try {
        const [farmData, planData] = await Promise.all([
          getFarm(farmId),
          getPlan(planId),
        ]);
        setFarm(farmData);
        setPlan(planData);
        setTitleValue(planData.title);
        if (planData.elements && Array.isArray(planData.elements) && planData.elements.length > 0) {
          setElements(planData.elements.map((el: any) => ({
            id: el.id || crypto.randomUUID(),
            type: el.type as ElementType,
            label: el.label || "",
            color: el.color || "#2d7a4f",
            geometry: el.geometry,
          })));
        }
      } catch (err: any) {
        console.error("Failed to load plan:", err);
        setError(err.message || "Failed to load plan data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [farmId, planId]);

  // ── Initialize map ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || !farm || map.current) return;

    const apiKey = STADIA_API_KEY;
    if (!apiKey || apiKey === "your-stadia-api-key-here") {
      mapContainer.current.innerHTML = `<div class="flex items-center justify-center h-full bg-[#1a5632] text-white p-8"><div class="text-center"><p class="text-lg font-semibold mb-2">MapLibre — Setup Required</p><p class="text-sm text-[#9dc9ae]">Add VITE_STADIA_API_KEY to web/.env</p></div></div>`;
      return;
    }

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: TILE_STYLES.satellite,
      center: [3.3792, 6.5244],
      zoom: 12,
      attributionControl: { compact: true },
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-left");

    const m = map.current;

    m.on("load", () => {
      mapLoaded.current = true;

      if (farm.boundary) {
        (m as any).addSource("farm-boundary", {
          type: "geojson",
          data: { type: "Feature", geometry: farm.boundary },
        });

        m.addLayer({
          id: "farm-boundary-fill",
          type: "fill",
          source: "farm-boundary",
          paint: { "fill-color": "#2d7a4f", "fill-opacity": 0.15 },
        });

        m.addLayer({
          id: "farm-boundary-line",
          type: "line",
          source: "farm-boundary",
          paint: { "line-color": "#1a4d2e", "line-width": 3, "line-opacity": 0.8 },
        });

        const bounds = new maplibregl.LngLatBounds();
        const coords = farm.boundary.coordinates;
        const flatten = (ring: number[][]) => ring.forEach(([lng, lat]) => bounds.extend([lng, lat]));
        if (farm.boundary.type === "Polygon") flatten(coords[0] || []);
        else coords.forEach((poly: number[][][]) => poly.forEach(flatten));
        if (!bounds.isEmpty()) m.fitBounds(bounds, { padding: 80, maxZoom: 18 });
      }
    });
  }, [farm]);

  // ── Add element to map ───────────────────────────────────────────────────
  const addElementToMap = useCallback((el: PlanElement) => {
    const m = map.current;
    if (!m || !mapLoaded.current) return;

    const sourceId = `element-${el.id}`;
    const layerId = `element-fill-${el.id}`;
    const layerIdLine = `element-line-${el.id}`;
    const layerIdPoint = `element-point-${el.id}`;

    if (m.getLayer(layerId)) m.removeLayer(layerId);
    if (m.getLayer(layerIdLine)) m.removeLayer(layerIdLine);
    if (m.getLayer(layerIdPoint)) m.removeLayer(layerIdPoint);
    if ((m as any).getSource(sourceId)) (m as any).removeSource(sourceId);

    const existingMarker = m.getCanvas(`element-marker-${el.id}`);
    if (existingMarker) existingMarker.remove();

    (m as any).addSource(sourceId, {
      type: "geojson",
      data: { type: "Feature", geometry: el.geometry },
    });

    if (el.type === "zone") {
      m.addLayer({
        id: layerId,
        type: "fill",
        source: sourceId,
        paint: { "fill-color": el.color, "fill-opacity": 0.25 },
      });
      m.addLayer({
        id: layerIdLine,
        type: "line",
        source: sourceId,
        paint: { "line-color": el.color, "line-width": 2 },
      });
    }

    if (el.type === "path") {
      m.addLayer({
        id: layerIdLine,
        type: "line",
        source: sourceId,
        paint: { "line-color": el.color, "line-width": 3, "line-dasharray": [4, 2] },
      });
    }

    if (el.type === "marker") {
      m.addLayer({
        id: layerIdPoint,
        type: "circle",
        source: sourceId,
        paint: {
          "circle-radius": 8,
          "circle-color": el.color,
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });
      const coords = el.geometry.coordinates;
      const markerEl = new maplibregl.Marker({ color: el.color, scale: 0.8 })
        .setLngLat(coords)
        .setPopup(
          new maplibregl.Popup({ offset: 15, closeButton: false })
            .setHTML(`<div style="font-size:12px;font-weight:600;color:#1c1c1a;font-family:sans-serif">${el.label || "Marker"}</div>`)
        )
        .addTo(m);
    }

    m.on(`click ${layerId}`, () => {
      setSelectedElementId(el.id);
      setEditLabel(el.label);
      setEditColor(el.color);
      setSidebarOpen(true);
    });

    if (m.getLayer(layerIdLine)) {
      m.on(`click ${layerIdLine}`, () => {
        setSelectedElementId(el.id);
        setEditLabel(el.label);
        setEditColor(el.color);
        setSidebarOpen(true);
      });
    }

    if (m.getLayer(layerIdPoint)) {
      m.on(`click ${layerIdPoint}`, () => {
        setSelectedElementId(el.id);
        setEditLabel(el.label);
        setEditColor(el.color);
        setSidebarOpen(true);
      });
    }
  }, []);

  // ── Remove element from map ──────────────────────────────────────────────
  const removeElementFromMap = useCallback((el: PlanElement) => {
    const m = map.current;
    if (!m) return;

    const sourceId = `element-${el.id}`;
    const layerId = `element-fill-${el.id}`;
    const layerIdLine = `element-line-${el.id}`;
    const layerIdPoint = `element-point-${el.id}`;

    if (m.getLayer(layerId)) m.removeLayer(layerId);
    if (m.getLayer(layerIdLine)) m.removeLayer(layerIdLine);
    if (m.getLayer(layerIdPoint)) m.removeLayer(layerIdPoint);
    if ((m as any).getSource(sourceId)) (m as any).removeSource(sourceId);
  }, []);

  // ── Add all elements to map when they change ─────────────────────────────
  useEffect(() => {
    elements.forEach((el) => addElementToMap(el));
  }, [elements, addElementToMap]);

  // ── Toggle layer visibility ──────────────────────────────────────────────
  const handleToggleLayer = (layer: keyof typeof layerVisibility) => {
    setLayerVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }));

    const m = map.current;
    if (!m) return;

    const isOn = layerVisibility[layer];
    const elementElements = elements.filter((el) =>
      layer === "zones" ? el.type === "zone" :
      layer === "paths" ? el.type === "path" :
      el.type === "marker"
    );

    elementElements.forEach((el) => {
      const layerId = `element-fill-${el.id}`;
      const layerIdLine = `element-line-${el.id}`;
      const layerIdPoint = `element-point-${el.id}`;

      if (el.type === "zone") {
        if (m.getLayer(layerId)) m.setLayoutProperty(layerId, "visibility", isOn ? "visible" : "none");
        if (m.getLayer(layerIdLine)) m.setLayoutProperty(layerIdLine, "visibility", isOn ? "visible" : "none");
      } else if (el.type === "path") {
        if (m.getLayer(layerIdLine)) m.setLayoutProperty(layerIdLine, "visibility", isOn ? "visible" : "none");
      } else if (el.type === "marker") {
        if (m.getLayer(layerIdPoint)) m.setLayoutProperty(layerIdPoint, "visibility", isOn ? "visible" : "none");
      }
    });
  };

  // ── Draw preview layer ───────────────────────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const previewId = "draw-preview";
    const previewFillId = "draw-preview-fill";
    const previewPointId = "draw-preview-point";

    if (m.getLayer(previewFillId)) m.removeLayer(previewFillId);
    if (m.getLayer(previewId)) m.removeLayer(previewId);
    if (m.getLayer(previewPointId)) m.removeLayer(previewPointId);
    if ((m as any).getSource(previewId)) (m as any).removeSource(previewId);

    if (drawingCoords.length === 0) return;

    (m as any).addSource(previewId, {
      type: "geojson",
      data: { type: "Feature", geometry: null as any },
    });

    if (tool === "zone" && drawingCoords.length >= 3) {
      const ring = [...drawingCoords, drawingCoords[0]];
      const feature = { type: "Feature", geometry: { type: "Polygon", coordinates: [ring] } };
      (m as any).getSource(previewId).setData(feature);

      m.addLayer({
        id: previewFillId,
        type: "fill",
        source: previewId,
        paint: { "fill-color": "#2d7a4f", "fill-opacity": 0.3 },
      });
      m.addLayer({
        id: previewId,
        type: "line",
        source: previewId,
        paint: { "line-color": "#2d7a4f", "line-width": 2, "line-dasharray": [3, 2] },
      });
    } else if (tool === "path" && drawingCoords.length >= 2) {
      const feature = { type: "Feature", geometry: { type: "LineString", coordinates: drawingCoords } };
      (m as any).getSource(previewId).setData(feature);

      m.addLayer({
        id: previewId,
        type: "line",
        source: previewId,
        paint: { "line-color": "#c8a96e", "line-width": 3, "line-dasharray": [3, 2] },
      });
    } else if (tool === "marker" && drawingCoords.length === 1) {
      const coords = drawingCoords[0];
      const feature = { type: "Feature", geometry: { type: "Point", coordinates: coords } };
      (m as any).getSource(previewId).setData(feature);

      m.addLayer({
        id: previewPointId,
        type: "circle",
        source: previewId,
        paint: {
          "circle-radius": 8,
          "circle-color": "#e53935",
          "circle-stroke-color": "#fff",
          "circle-stroke-width": 2,
        },
      });
    }
  }, [drawingCoords, tool]);

  // ── Map click handler ────────────────────────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !tool) return;

    const handler = (e: maplibregl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      const coord: [number, number] = [lng, lat];

      if (tool === "marker") {
        const newElement: PlanElement = {
          id: crypto.randomUUID(),
          type: "marker",
          label: `Marker ${elements.length + 1}`,
          color: MARKER_COLORS[elements.filter((el) => el.type === "marker").length % MARKER_COLORS.length],
          geometry: { type: "Point", coordinates: coord },
        };
        setElements((prev) => [...prev, newElement]);
        setDrawingCoords([]);
        setTool(null);
        setSelectedElementId(newElement.id);
        setEditLabel(newElement.label);
        setEditColor(newElement.color);
        setSidebarOpen(true);
        setUnsaved(true);
        addElementToMap(newElement);
        return;
      }

      if (tool === "path") {
        setDrawingCoords((prev) => [...prev, coord]);
        return;
      }

      if (tool === "zone") {
        setDrawingCoords((prev) => [...prev, coord]);
      }
    };

    m.on("click", handler);
    return () => { m.off("click", handler); };
  }, [tool, drawingCoords, addElementToMap, elements.length]);

  // ── Double-click to finish drawing ───────────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !tool) return;

    const handler = (e: maplibregl.MapMouseEvent) => {
      if (tool !== "zone" && tool !== "path") return;
      if (drawingCoords.length < (tool === "zone" ? 3 : 2)) return;

      const newElement: PlanElement = {
        id: crypto.randomUUID(),
        type: tool,
        label: tool === "zone" ? `Zone ${elements.filter((el) => el.type === "zone").length + 1}` : `Path ${elements.filter((el) => el.type === "path").length + 1}`,
        color:
          tool === "zone"
            ? ZONE_COLORS[elements.filter((el) => el.type === "zone").length % ZONE_COLORS.length]
            : PATH_COLORS[elements.filter((el) => el.type === "path").length % PATH_COLORS.length],
        geometry:
          tool === "zone"
            ? { type: "Polygon", coordinates: [...drawingCoords, drawingCoords[0]] }
            : { type: "LineString", coordinates: drawingCoords },
      };

      setElements((prev) => [...prev, newElement]);
      setDrawingCoords([]);
      setTool(null);
      setSelectedElementId(newElement.id);
      setEditLabel(newElement.label);
      setEditColor(newElement.color);
      setSidebarOpen(true);
      setUnsaved(true);
      addElementToMap(newElement);
    };

    m.on("dblclick", handler);
    return () => { m.off("dblclick", handler); };
  }, [drawingCoords, tool, addElementToMap, elements.length]);

  // ── Right-click to cancel drawing ────────────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !tool) return;

    const handler = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();
      setDrawingCoords([]);
      setTool(null);
    };

    m.on("contextmenu", handler);
    return () => { m.off("contextmenu", handler); };
  }, [tool]);

  // ── Save plan ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!planId) return;

    setSaving(true);
    setError(null);
    try {
      await updatePlanElements(planId, elements);
      setPlan((prev) => prev ? { ...prev, elements } : prev);
      setUnsaved(false);
    } catch (err: any) {
      console.error("Failed to save plan:", err);
      setError(err.message || "Failed to save plan.");
    } finally {
      setSaving(false);
    }
  };

  // ── Update plan metadata ─────────────────────────────────────────────────
  const handleUpdatePlanMetadata = async (updates: { title?: string; status?: string }) => {
    if (!planId) return;

    try {
      const updated = await updatePlanMetadata(planId, updates);
      setPlan(updated);
      if (updates.title) setTitleValue(updates.title);
    } catch (err: any) {
      console.error("Failed to update plan:", err);
    }
  };

  // ── Delete selected element ──────────────────────────────────────────────
  const handleDeleteElement = () => {
    if (!selectedElementId) return;
    setElements((prev) => prev.filter((el) => el.id !== selectedElementId));
    setSelectedElementId(null);
    setEditLabel("");
    setUnsaved(true);

    const el = elements.find((e) => e.id === selectedElementId);
    if (el) removeElementFromMap(el);
  };

  // ── Update selected element properties ───────────────────────────────────
  const handleUpdateElement = () => {
    if (!selectedElementId) return;
    setElements((prev) =>
      prev.map((el) =>
        el.id === selectedElementId ? { ...el, label: editLabel, color: editColor } : el
      )
    );
    setUnsaved(true);
  };

  // ── Cancel / go back ─────────────────────────────────────────────────────
  const handleCancel = () => {
    if (unsaved && elements.length > 0) {
      if (!confirm("You have unsaved changes. Discard them?")) return;
    }
    navigate(`/studio/${farmId}`);
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f5f0]">
        <div className="text-center">
          <svg className="animate-spin w-8 h-8 text-[#1a4d2e] mx-auto mb-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
            <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-[#5a5a57]">Loading plan editor…</p>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error && !unsaved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f5f0]">
        <div className="text-center p-8">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-red-500 mx-auto mb-4" aria-hidden="true">
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" />
            <path d="M24 14v12M24 30v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h2 className="text-lg font-semibold text-[#1c1c1a] mb-2">Failed to load plan</h2>
          <p className="text-sm text-[#5a5a57] mb-4">{error}</p>
          <Link to={`/studio/${farmId}`} className="inline-flex items-center gap-2 bg-[#1a4d2e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2d7a4f] transition-colors">
            Back to studio
          </Link>
        </div>
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f5f0]">
        <div className="text-center p-8">
          <p className="text-sm text-[#5a5a57]">Farm not found.</p>
          <Link to="/dashboard" className="inline-flex items-center gap-2 bg-[#1a4d2e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2d7a4f] transition-colors mt-4">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const selectedElement = elements.find((el) => el.id === selectedElementId);
  const zoneCount = elements.filter((el) => el.type === "zone").length;
  const pathCount = elements.filter((el) => el.type === "path").length;
  const markerCount = elements.filter((el) => el.type === "marker").length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f5f0] font-sans relative">
      <FontLoader />

      {/* Top bar */}
      <header className="bg-[#0f3320] text-white px-4 py-3 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="w-8 h-8 rounded-lg bg-[#1a4d2e] border border-[#2d7a4f] flex items-center justify-center hover:bg-[#2d7a4f] transition-colors"
            aria-label="Go back"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 2L3 7l6 5" stroke="#c8a96e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-semibold leading-tight">{farm.name}</h1>
            <p className="text-xs text-[#9dc9ae] leading-tight mt-0.5">
              {plan?.title || "Plan"} · Drawing mode
            </p>
          </div>
          {plan && (
            <select
              value={plan.status}
              onChange={(e) => handleUpdatePlanMetadata({ status: e.target.value })}
              className="text-xs px-2 py-1 rounded bg-[#1a4d2e] border border-[#2d7a4f] text-[#c8a96e] focus:outline-none focus:border-[#c8a96e] cursor-pointer"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unsaved && elements.length > 0 && (
            <span className="text-xs text-[#c8a96e] animate-pulse mr-2">Unsaved changes</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || elements.length === 0}
            className="bg-[#1a4d2e] text-white px-3 py-2 rounded-lg text-xs font-medium hover:bg-[#2d7a4f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Saving…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M2 10l4 4 4-4M2 6l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Save plan
              </>
            )}
          </button>
        </div>
      </header>

      {/* Drawing toolbar */}
      <div className="bg-white border-b border-[#e4e4e0] px-3 py-2 flex items-center gap-2 shrink-0 z-40">
        <span className="text-xs text-[#8a8a87] font-medium mr-1">Tools:</span>
        {(["zone", "path", "marker"] as ElementType[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              if (tool === t) {
                setTool(null);
                setDrawingCoords([]);
              } else {
                setTool(t);
                setSelectedElementId(null);
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tool === t
                ? "bg-[#1a4d2e] text-white shadow-sm"
                : "bg-[#f7f5f0] text-[#3a3a38] hover:bg-[#e8f0e9] hover:text-[#1a4d2e]"
            }`}
          >
            {toolIcons[t]}
            <span className="hidden sm:inline">{toolLabels[t]}</span>
          </button>
        ))}

        {tool && (
          <span className="text-xs text-[#5a5a57] ml-2 animate-pulse">
            {tool === "zone" && "Click to add points. Double-click to finish."}
            {tool === "path" && "Click to add points. Double-click to finish."}
            {tool === "marker" && "Click anywhere to place a marker."}
          </span>
        )}

        {drawingCoords.length > 0 && (
          <button
            onClick={() => setDrawingCoords([])}
            className="ml-2 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded"
          >
            Clear drawing
          </button>
        )}

        <div className="flex-1" />

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-8 h-8 rounded-lg bg-[#f7f5f0] border border-[#d8d8d4] flex items-center justify-center hover:bg-[#e8f0e9] transition-colors text-[#3a3a38]"
          aria-label="Toggle sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Map */}
        <div className="flex-1 min-h-0 relative">
          <div ref={mapContainer} className="w-full h-full" />
          {!tool && elements.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#f7f5f0]/80 pointer-events-none">
              <div className="text-center p-8">
                <div className="w-12 h-12 rounded-xl bg-[#e8f0e9] flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="#1a4d2e" strokeWidth="1.3" strokeLinejoin="round" />
                    <path d="M8 12h8M12 8v8" stroke="#1a4d2e" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-[#1c1c1a] mb-1">Start drawing elements</p>
                <p className="text-xs text-[#5a5a57]">Select a tool above to draw zones, paths, or markers</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside
          className={`absolute top-[48px] right-0 bottom-0 w-full sm:w-80 bg-white border-l border-[#e4e4e0] flex flex-col overflow-y-auto transition-transform duration-300 z-40 ${
            sidebarOpen ? "translate-x-0" : "translate-x-full sm:translate-x-0"
          }`}
        >
          <div className="flex-1 flex flex-col">
            {/* Layer visibility toggles */}
            <div className="p-4 border-b border-[#e4e4e0]">
              <h2 className="text-xs font-semibold text-[#8a8a87] uppercase tracking-wider mb-3">Layers</h2>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layerVisibility.zones}
                    onChange={() => handleToggleLayer("zones")}
                    className="w-4 h-4 rounded border-gray-300 text-[#2d7a4f] focus:ring-[#2d7a4f]"
                  />
                  <span className="text-xs text-[#1c1c1a]">
                    Zones ({zoneCount})
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layerVisibility.paths}
                    onChange={() => handleToggleLayer("paths")}
                    className="w-4 h-4 rounded border-gray-300 text-[#2d7a4f] focus:ring-[#2d7a4f]"
                  />
                  <span className="text-xs text-[#1c1c1a]">
                    Paths ({pathCount})
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={layerVisibility.markers}
                    onChange={() => handleToggleLayer("markers")}
                    className="w-4 h-4 rounded border-gray-300 text-[#2d7a4f] focus:ring-[#2d7a4f]"
                  />
                  <span className="text-xs text-[#1c1c1a]">
                    Markers ({markerCount})
                  </span>
                </label>
              </div>
            </div>

            {/* Element list */}
            <div className="p-4 border-b border-[#e4e4e0]">
              <h2 className="text-xs font-semibold text-[#8a8a87] uppercase tracking-wider mb-3">Elements ({elements.length})</h2>

              {elements.length === 0 ? (
                <p className="text-xs text-[#5a5a57] text-center py-6">No elements drawn yet</p>
              ) : (
                <div className="space-y-1.5">
                  {elements.map((el) => (
                    <button
                      key={el.id}
                      onClick={() => {
                        setSelectedElementId(el.id);
                        setEditLabel(el.label);
                        setEditColor(el.color);
                      }}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                        selectedElementId === el.id
                          ? "bg-[#e8f0e9] border border-[#2d7a4f]"
                          : hoverElementId === el.id
                          ? "bg-[#f0fdf4] border border-transparent"
                          : "border border-transparent hover:bg-[#fafaf8]"
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: el.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#1c1c1a] truncate">
                          {el.label || `Unnamed ${el.type}`}
                        </p>
                        <p className="text-[10px] text-[#8a8a87] capitalize">{el.type}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Properties panel */}
            {selectedElement && (
              <div className="p-4 border-b border-[#e4e4e0]">
                <h2 className="text-xs font-semibold text-[#8a8a87] uppercase tracking-wider mb-3">Properties</h2>

                <div className="space-y-3">
                  <div>
                    <label htmlFor="el-label" className="block text-xs font-medium text-[#3a3a38] mb-1">Label</label>
                    <input
                      id="el-label"
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      onBlur={handleUpdateElement}
                      className="w-full bg-[#f7f5f0] border border-[#d8d8d4] rounded-lg px-3 py-2 text-xs text-[#1c1c1a] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                      placeholder="Enter label…"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#3a3a38] mb-1.5">Color</label>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        selectedElement.type === "zone"
                          ? ZONE_COLORS
                          : selectedElement.type === "path"
                          ? PATH_COLORS
                          : MARKER_COLORS
                      ).map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            setEditColor(color);
                            handleUpdateElement();
                          }}
                          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                            editColor === color ? "border-[#1a4d2e] scale-110" : "border-transparent"
                          }`}
                          style={{ backgroundColor: color }}
                          aria-label={`Select color ${color}`}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleDeleteElement}
                    className="w-full bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                  >
                    Delete element
                  </button>
                </div>
              </div>
            )}

            {/* Help */}
            <div className="p-4 bg-[#fafaf8]">
              <p className="text-[10px] text-[#8a8a87] leading-relaxed">
                <strong>Tips:</strong><br />
                • Click to add points, double-click to finish drawing<br />
                • Right-click to cancel current drawing<br />
                • Click an element on the map to edit it<br />
                • Changes are saved when you click "Save plan"
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
