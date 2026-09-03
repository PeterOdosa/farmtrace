import { useState, useCallback, useRef, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { supabase, Farm, FarmPlan } from "../lib/supabase";
import { TILE_STYLES, STADIA_API_KEY } from "../config/env";
import { getFarm, getFarmPlans, createFarmPlan, deletePlan, updatePlanMetadata } from "../services/api";

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

// ─── Status helpers ───────────────────────────────────────────────────────────
const statusConfig = {
  draft: { color: "bg-gray-100 text-gray-600", label: "Draft" },
  active: { color: "bg-green-100 text-green-700", label: "Active" },
  completed: { color: "bg-amber-100 text-amber-700", label: "Completed" },
};

function cropLabel(crop: string | null) {
  if (!crop) return "No crop";
  return crop
    .split(/(?=[A-Z])/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function cropColor(crop: string | null) {
  const map: Record<string, string> = {
    "oil palm": "bg-amber-100 text-amber-800",
    maize: "bg-yellow-100 text-yellow-800",
    cassava: "bg-orange-100 text-orange-800",
    cocoa: "bg-[#e8d5c4] text-[#7c4f2a]",
    rubber: "bg-slate-100 text-slate-700",
    rice: "bg-green-100 text-green-700",
    soybean: "bg-lime-100 text-lime-800",
    yams: "bg-purple-100 text-purple-800",
    vegetables: "bg-emerald-100 text-emerald-700",
  };
  return crop ? (map[crop.toLowerCase()] ?? "bg-gray-100 text-gray-600") : "bg-gray-100 text-gray-500";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Studio Shell ─────────────────────────────────────────────────────────────
export default function Studio() {
  const { farmId } = useParams<{ farmId: string }>();
  const navigate = useNavigate();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const boundaryLayerRef = useRef<string | null>(null);

  const [farm, setFarm] = useState<Farm | null>(null);
  const [plans, setPlans] = useState<FarmPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Redirect if no farmId
  useEffect(() => {
    if (!farmId) {
      navigate("/dashboard", { replace: true });
    }
  }, [farmId, navigate]);

  // ── Load farm + plans ────────────────────────────────────────────────────
  useEffect(() => {
    if (!farmId) return;
    const load = async () => {
      try {
        const farmData = await getFarm(farmId);
        setFarm(farmData);
        const plansData = await getFarmPlans(farmId);
        setPlans(plansData);
      } catch (err: any) {
        console.error("Failed to load studio:", err);
        setError(err.message || "Failed to load farm data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [farmId]);

  // ── Initialize map ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || !farm || !farm.boundary || map.current) return;

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
    map.current.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");

    map.current.on("load", () => {
      addBoundaryToMap();
    });
  }, [farm]);

  // ── Add boundary layer to map ────────────────────────────────────────────
  const addBoundaryToMap = () => {
    if (!map.current || !farm?.boundary) return;

    const geojson = {
      type: "Feature" as const,
      geometry: farm.boundary,
    };

    // Remove existing boundary layer if present
    if (boundaryLayerRef.current && map.current.getLayer(boundaryLayerRef.current)) {
      map.current.removeLayer(boundaryLayerRef.current);
    }
    if ((map.current as any).getSource("farm-boundary")) {
      (map.current as any).removeSource("farm-boundary");
    }

    // Add new source
    (map.current as any).addSource("farm-boundary", {
      type: "geojson",
      data: geojson,
    });

    // Fill layer
    map.current.addLayer({
      id: "farm-boundary-fill",
      type: "fill",
      source: "farm-boundary",
      paint: {
        "fill-color": "#2d7a4f",
        "fill-opacity": 0.2,
      },
    });

    // Line layer
    map.current.addLayer({
      id: "farm-boundary-line",
      type: "line",
      source: "farm-boundary",
      paint: {
        "line-color": "#1a4d2e",
        "line-width": 3,
        "line-opacity": 0.8,
      },
    });

    boundaryLayerRef.current = "farm-boundary-line";

    // Fit bounds
    const bounds = new maplibregl.LngLatBounds();
    const coords = geojson.geometry.coordinates;

    const flatten = (ring: number[][]) => {
      ring.forEach(([lng, lat]) => bounds.extend([lng, lat]));
    };

    if (geojson.geometry.type === "Polygon") {
      flatten(coords[0] || []);
    } else if (geojson.geometry.type === "MultiPolygon") {
      coords.forEach((poly: number[][][]) => poly.forEach(flatten));
    }

    if (bounds.isEmpty()) {
      map.current?.fitBounds([[3.3, 6.4], [3.5, 6.6]], { padding: 60, maxZoom: 18 });
    } else {
      map.current?.fitBounds(bounds, { padding: 60, maxZoom: 18 });
    }
  };

  // ── Cleanup map ──────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // ── Create new plan ──────────────────────────────────────────────────────
  const handleCreatePlan = async () => {
    if (!farmId) return;
    setCreating(true);
    try {
      const newPlan = await createFarmPlan(farmId, "New Plan", null);
      setPlans((prev) => [newPlan, ...prev]);
      navigate(`/studio/${farmId}/plan/${newPlan.id}`);
    } catch (err: any) {
      console.error("Failed to create plan:", err);
      setError(err.message || "Failed to create plan.");
    } finally {
      setCreating(false);
    }
  };

  // ── Delete plan ──────────────────────────────────────────────────────────
  const handleDeletePlan = async (planId: string) => {
    if (!confirm("Are you sure you want to delete this plan? This cannot be undone.")) return;
    setDeletingPlanId(planId);
    try {
      await deletePlan(planId);
      setPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch (err: any) {
      console.error("Failed to delete plan:", err);
      setError(err.message || "Failed to delete plan.");
    } finally {
      setDeletingPlanId(null);
    }
  };

  // ── Update plan status ──────────────────────────────────────────────────
  const handleUpdatePlanStatus = async (planId: string, status: string) => {
    try {
      await updatePlanMetadata(planId, { status });
      setPlans((prev) => prev.map((p) => p.id === planId ? { ...p, status: status as FarmPlan["status"] } : p));
      setEditingStatusId(null);
    } catch (err: any) {
      console.error("Failed to update plan status:", err);
    }
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
          <p className="text-sm text-[#5a5a57]">Loading studio…</p>
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f5f0]">
        <div className="text-center p-8">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="text-red-500 mx-auto mb-4" aria-hidden="true">
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2" />
            <path d="M24 14v12M24 30v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h2 className="text-lg font-semibold text-[#1c1c1a] mb-2">Failed to load farm</h2>
          <p className="text-sm text-[#5a5a57] mb-4">{error}</p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-[#1a4d2e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2d7a4f] transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── No farm ──────────────────────────────────────────────────────────────
  if (!farm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f5f0]">
        <div className="text-center p-8">
          <p className="text-sm text-[#5a5a57]">Farm not found.</p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-[#1a4d2e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2d7a4f] transition-colors mt-4"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── Main studio UI ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f5f0] font-sans relative">
      <FontLoader />

      {/* Top bar */}
      <header className="bg-[#0f3320] text-white px-4 py-3 flex items-center justify-between shrink-0 z-50">
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
          <div>
            <h1 className="text-sm font-semibold leading-tight">{farm.name}</h1>
            <p className="text-xs text-[#9dc9ae] leading-tight mt-0.5">
              {cropLabel(farm.crop_type)}
              {farm.area_hectares && ` · ${farm.area_hectares.toFixed(2)} ha`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 rounded-lg bg-[#1a4d2e] border border-[#2d7a4f] flex items-center justify-center hover:bg-[#2d7a4f] transition-colors text-white"
            aria-label="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 4h10M3 8h10M3 12h10" stroke="#c8a96e" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Map */}
        <div className="flex-1 min-h-0 relative">
          <div ref={mapContainer} className="w-full h-full" />
        </div>

        {/* Sidebar */}
        <aside
          className={`absolute top-0 right-0 h-full w-full sm:w-80 bg-white border-l border-[#e4e4e0] flex flex-col overflow-y-auto transition-transform duration-300 z-40 ${
            sidebarOpen ? "translate-x-0" : "translate-x-full sm:translate-x-0"
          }`}
        >
          <div className="flex-1 flex flex-col">
            {/* Farm details */}
            <div className="p-5 border-b border-[#e4e4e0]">
              <h2 className="text-xs font-semibold text-[#8a8a87] uppercase tracking-wider mb-3">Farm details</h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#5a5a57]">Crop type</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cropColor(farm.crop_type)}`}>
                    {cropLabel(farm.crop_type)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#5a5a57]">Area</span>
                  <span className="text-sm font-medium text-[#1c1c1a]">
                    {farm.area_hectares ? `${farm.area_hectares.toFixed(2)} ha` : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#5a5a57]">Perimeter</span>
                  <span className="text-sm font-medium text-[#1c1c1a]">
                    {farm.perimeter_km ? `${farm.perimeter_km.toFixed(2)} km` : "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#5a5a57]">Created</span>
                  <span className="text-xs text-[#5a5a57]">{farm.created_at ? formatDate(farm.created_at) : "—"}</span>
                </div>
              </div>
            </div>

            {/* Plans section */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-5 border-b border-[#e4e4e0]">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold text-[#8a8a87] uppercase tracking-wider">Plans</h2>
                  <button
                    onClick={handleCreatePlan}
                    disabled={creating}
                    className="inline-flex items-center gap-1 bg-[#1a4d2e] text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-[#2d7a4f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? (
                      <>
                        <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                          <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        Creating…
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                          <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        New
                      </>
                    )}
                  </button>
                </div>

                {/* Plans list */}
                <div className="space-y-2">
                  {plans.length === 0 ? (
                    <div className="text-center py-8">
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-[#d8d8d4] mx-auto mb-3" aria-hidden="true">
                        <rect x="4" y="4" width="24" height="24" rx="4" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M16 12v8M12 16h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <p className="text-xs text-[#5a5a57]">No plans yet</p>
                      <p className="text-[10px] text-[#8a8a87] mt-1">Create your first plan to start mapping</p>
                    </div>
                  ) : (
                    plans.map((plan) => {
                      const config = statusConfig[plan.status];
                      return (
                        <div
                          key={plan.id}
                          className="p-3 rounded-lg border border-[#e4e4e0] hover:border-[#2d7a4f] hover:shadow-sm transition-all group"
                        >
                          <Link
                            to={`/studio/${farm.id}/plan/${plan.id}`}
                            className="block"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-[#1c1c1a] truncate group-hover:text-[#1a4d2e] transition-colors">
                                  {plan.title}
                                </h3>
                                <p className="text-[10px] text-[#5a5a57] mt-0.5">
                                  {formatDate(plan.created_at)}
                                </p>
                              </div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${config.color}`}>
                                {config.label}
                              </span>
                            </div>
                          </Link>

                          <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[#e4e4e0]">
                            {/* Status dropdown */}
                            <div className="relative flex-1">
                              <select
                                value={plan.status}
                                onChange={(e) => handleUpdatePlanStatus(plan.id, e.target.value)}
                                className="w-full text-[10px] px-2 py-1 rounded border border-[#e4e4e0] bg-white text-[#1c1c1a] focus:outline-none focus:border-[#2d7a4f] appearance-none cursor-pointer"
                              >
                                <option value="draft">Draft</option>
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                              </select>
                            </div>

                            {/* Delete button */}
                            <button
                              onClick={() => handleDeletePlan(plan.id)}
                              disabled={deletingPlanId === plan.id}
                              className="w-7 h-7 flex items-center justify-center rounded border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50 shrink-0"
                              title="Delete plan"
                            >
                              {deletingPlanId === plan.id ? (
                                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                              ) : (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                  <path d="M2 3h8M4.5 3V2h3v1M5 5v4M7 5v4M3.5 3l.5 7h4l.5-7" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar footer */}
            <div className="p-4 border-t border-[#e4e4e0] bg-[#fafaf8]">
              <p className="text-[10px] text-[#8a8a87] text-center">
                Import GPS boundaries from the dashboard to get started
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
