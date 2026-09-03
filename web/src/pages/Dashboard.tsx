import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { deleteFarm } from "../services/api";

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
type Farm = {
  id: string;
  name: string;
  crop_type: string | null;
  area_hectares: number | null;
  perimeter_km: number | null;
  updated_at: string;
  has_plan: boolean;
};

type UserProfile = {
  full_name: string | null;
  role: "farmer" | "agronomist" | "org_admin";
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function cropColor(crop: string | null): string {
  const map: Record<string, string> = {
    "oil palm": "bg-amber-100 text-amber-800",
    "maize": "bg-yellow-100 text-yellow-800",
    "cassava": "bg-orange-100 text-orange-800",
    "cocoa": "bg-brown-100 text-[#7c4f2a]",
    "rubber": "bg-slate-100 text-slate-700",
  };
  return crop ? (map[crop.toLowerCase()] ?? "bg-[#e8f0e9] text-[#1a4d2e]") : "bg-gray-100 text-gray-500";
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({
  profile,
  onSignOut,
  activePath,
}: {
  profile: UserProfile | null;
  onSignOut: () => void;
  activePath: string;
}) {
  const nav = [
    {
      label: "Farms",
      path: "/dashboard",
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M9 2L16 6v6l-7 4-7-4V6l7-4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <circle cx="9" cy="9" r="2" fill="currentColor" />
        </svg>
      ),
    },
    {
      label: "Planning studio",
      path: "/studio",
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5 9h8M9 5v8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Collaborators",
      path: "/collaborators",
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.4" />
          <path d="M1 16c0-3 2.7-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M13 8a2 2 0 100-4M17 16c0-2-1.3-3.5-3-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Settings",
      path: "/settings",
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.2 3.2l1.4 1.4M13.4 13.4l1.4 1.4M3.2 14.8l1.4-1.4M13.4 4.6l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-[#0f3320] text-white px-4 py-6 shrink-0">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mb-10 px-2">
        <div className="w-7 h-7 rounded-md bg-[#1a4d2e] border border-[#2d7a4f] flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2L13 5.5V10.5L8 14L3 10.5V5.5L8 2Z" stroke="#c8a96e" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="8" cy="8" r="1.5" fill="#c8a96e" />
          </svg>
        </div>
        <span className="font-semibold text-white text-sm tracking-tight">FarmTrace</span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1" aria-label="Main navigation">
        {nav.map((item) => {
          const active = activePath === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-[#1a4d2e] text-white"
                  : "text-[#9dc9ae] hover:bg-[#1a4d2e] hover:text-white"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-[#1a4d2e] pt-4 mt-4">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#c8a96e] flex items-center justify-center text-[#1a4d2e] font-bold text-sm shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.full_name ?? "User"}</p>
            <p className="text-xs text-[#9dc9ae] capitalize">{profile?.role ?? "farmer"}</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#9dc9ae] hover:bg-[#1a4d2e] hover:text-white transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M6 2H3a1 1 0 00-1 1v9a1 1 0 001 1h3M10 10l3-2.5L10 5M13 7.5H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ─── Top bar (mobile) ─────────────────────────────────────────────────────────
function TopBar({ profile, onSignOut }: { profile: UserProfile | null; onSignOut: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0f3320] text-white">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-[#1a4d2e] border border-[#2d7a4f] flex items-center justify-center">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2L13 5.5V10.5L8 14L3 10.5V5.5L8 2Z" stroke="#c8a96e" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="font-semibold text-sm">FarmTrace</span>
      </div>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
        className="text-[#9dc9ae] hover:text-white"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {menuOpen && (
        <div className="absolute top-14 left-0 right-0 bg-[#0f3320] z-50 px-4 py-4 flex flex-col gap-2 shadow-xl">
          {[
            { label: "Farms", path: "/dashboard" },
            { label: "Planning studio", path: "/studio" },
            { label: "Collaborators", path: "/collaborators" },
            { label: "Settings", path: "/settings" },
          ].map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className="text-sm text-[#9dc9ae] hover:text-white py-2 border-b border-[#1a4d2e]"
            >
              {item.label}
            </Link>
          ))}
          <button onClick={onSignOut} className="text-sm text-[#9dc9ae] hover:text-white py-2 text-left">
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar({ farms }: { farms: Farm[] }) {
  const totalArea = farms.reduce((s, f) => s + (f.area_hectares ?? 0), 0);
  const withPlans = farms.filter((f) => f.has_plan).length;
  const crops = [...new Set(farms.map((f) => f.crop_type).filter(Boolean))].length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {[
        { label: "Total farms", value: farms.length.toString() },
        { label: "Total area", value: `${totalArea.toFixed(1)} ha` },
        { label: "With plans", value: withPlans.toString() },
        { label: "Crop types", value: crops.toString() },
      ].map((s, i) => (
        <div key={i} className="bg-white rounded-xl border border-[#e4e4e0] px-5 py-4">
          <p className="text-xs text-[#8a8a87] mb-1">{s.label}</p>
          <p
            className="text-2xl font-bold text-[#1a4d2e]"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Farm card ────────────────────────────────────────────────────────────────
function FarmCard({
  farm,
  onDelete,
}: {
  farm: Farm;
  onDelete?: (farmId: string) => void;
}) {
  return (
    <Link
      to={`/studio/${farm.id}`}
      className="group bg-white rounded-xl border border-[#e4e4e0] hover:border-[#2d7a4f] hover:shadow-md transition-all overflow-hidden flex flex-col relative"
    >
      {/* Delete button — appears on hover */}
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(farm.id);
          }}
          className="absolute top-2 right-2 z-10 w-8 h-8 rounded-lg bg-white/90 border border-red-200 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all shadow-sm"
          aria-label={`Delete farm ${farm.name}`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 3h12M4 3V2a1 1 0 011-1h4a1 1 0 011 1v1M5 6v5M9 6v5M3 3l.5 8a1 1 0 001 1h4a1 1 0 001-1l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      {/* Mini map placeholder */}
      <div className="bg-[#0f3320] h-32 relative flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 200 120" className="w-full h-full opacity-80" aria-hidden="true">
          <defs>
            <pattern id={`grid-${farm.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2d7a4f" strokeWidth="0.4" opacity="0.5" />
            </pattern>
          </defs>
          <rect width="200" height="120" fill="#0f3320" />
          <rect width="200" height="120" fill={`url(#grid-${farm.id})`} />
          <polygon
            points="100,20 155,45 145,90 70,95 45,60 70,30"
            fill="#2d7a4f"
            opacity="0.3"
          />
          <polygon
            points="100,20 155,45 145,90 70,95 45,60 70,30"
            fill="none"
            stroke="#c8a96e"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {farm.has_plan && (
            <>
              <line x1="70" y1="30" x2="45" y2="15" stroke="#9dc9ae" strokeWidth="1" strokeDasharray="3 2" />
              <line x1="100" y1="55" x2="145" y2="55" stroke="#9dc9ae" strokeWidth="1" strokeDasharray="3 2" />
            </>
          )}
        </svg>
        {farm.has_plan && (
          <span className="absolute top-2 right-2 bg-[#1a4d2e] text-[#c8a96e] text-[10px] font-semibold px-2 py-0.5 rounded-full">
            Plan ready
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-[#1c1c1a] text-sm leading-tight group-hover:text-[#1a4d2e] transition-colors">
            {farm.name}
          </h3>
          {farm.crop_type && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 capitalize ${cropColor(farm.crop_type)}`}>
              {farm.crop_type}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#f7f5f0] rounded-lg px-3 py-2">
            <p className="text-[10px] text-[#8a8a87] mb-0.5">Area</p>
            <p className="text-sm font-semibold text-[#1c1c1a]">
              {farm.area_hectares != null ? `${farm.area_hectares.toFixed(1)} ha` : "—"}
            </p>
          </div>
          <div className="bg-[#f7f5f0] rounded-lg px-3 py-2">
            <p className="text-[10px] text-[#8a8a87] mb-0.5">Perimeter</p>
            <p className="text-sm font-semibold text-[#1c1c1a]">
              {farm.perimeter_km != null ? `${farm.perimeter_km.toFixed(2)} km` : "—"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#f0f0ec]">
          <p className="text-[10px] text-[#a0a09c]">Updated {formatDate(farm.updated_at)}</p>
          <span className="text-xs text-[#1a4d2e] font-medium group-hover:underline">
            Open studio →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#e8f0e9] flex items-center justify-center mb-5">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M16 4L28 10v12l-12 6-12-6V10l12-6z" stroke="#1a4d2e" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="16" cy="16" r="3" fill="#1a4d2e" />
        </svg>
      </div>
      <h3
        className="text-xl font-bold text-[#1c1c1a] mb-2"
        style={{ fontFamily: "'DM Serif Display', serif" }}
      >
        No farms yet
      </h3>
      <p className="text-sm text-[#5a5a57] max-w-xs mb-6 leading-relaxed">
        Add your first farm to start mapping boundaries and planning your layout.
      </p>
      <Link
        to="/farms/new"
        className="inline-flex items-center gap-2 bg-[#1a4d2e] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#2d7a4f] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Add your first farm
      </Link>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[#e4e4e0] overflow-hidden animate-pulse">
      <div className="bg-[#e8f0e9] h-32" />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-4 bg-[#e8f0e9] rounded w-2/3" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-12 bg-[#f0f0ec] rounded-lg" />
          <div className="h-12 bg-[#f0f0ec] rounded-lg" />
        </div>
        <div className="h-3 bg-[#f0f0ec] rounded w-1/2 mt-1" />
      </div>
    </div>
  );
}

// ─── Confirmation dialog ──────────────────────────────────────────────────────
function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6">
        <h3 className="text-lg font-bold text-[#1c1c1a] mb-2">{title}</h3>
        <p className="text-sm text-[#5a5a57] mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg text-sm font-medium border border-[#d8d8d4] text-[#1c1c1a] hover:bg-[#f0ede8] transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard page ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cropFilter, setCropFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"updated" | "area" | "name">("updated");

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [farmToDelete, setFarmToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Auth guard + fetch data ────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      // Fetch profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();
      setProfile(prof);

      // Fetch farms
      const { data: farmData } = await supabase
        .from("farms")
        .select("id, name, crop_type, area_hectares, perimeter_km, updated_at")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });

      // Check which farms have a plan
      const farmIds = (farmData ?? []).map((f: any) => f.id);
      let planSet = new Set<string>();
      if (farmIds.length > 0) {
        const { data: plans } = await supabase
          .from("farm_plans")
          .select("farm_id")
          .in("farm_id", farmIds);
        planSet = new Set((plans ?? []).map((p: any) => p.farm_id));
      }

      setFarms((farmData ?? []).map((f: any) => ({ ...f, has_plan: planSet.has(f.id) })));
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleDeleteFarm = (farmId: string) => {
    setFarmToDelete(farmId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!farmToDelete) return;
    setDeleting(true);
    try {
      await deleteFarm(farmToDelete);
      setFarms((prev) => prev.filter((f) => f.id !== farmToDelete));
      setDeleteConfirmOpen(false);
      setFarmToDelete(null);
    } catch (err: any) {
      alert(err.message ?? "Failed to delete farm.");
    } finally {
      setDeleting(false);
    }
  };

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const cropTypes = ["all", ...Array.from(new Set(farms.map((f) => f.crop_type).filter(Boolean) as string[]))];

  const filtered = farms
    .filter((f) => {
      const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
      const matchCrop = cropFilter === "all" || f.crop_type === cropFilter;
      return matchSearch && matchCrop;
    })
    .sort((a, b) => {
      if (sortBy === "area") return (b.area_hectares ?? 0) - (a.area_hectares ?? 0);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  return (
    <div className="min-h-screen flex bg-[#f7f5f0] font-sans relative">
      <FontLoader />
      <Sidebar profile={profile} onSignOut={handleSignOut} activePath="/dashboard" />
      <TopBar profile={profile} onSignOut={handleSignOut} />

      {/* Main content */}
      <main className="flex-1 min-w-0 px-5 md:px-8 py-6 md:py-8 mt-14 md:mt-0">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1
              className="text-2xl md:text-3xl font-bold text-[#1c1c1a]"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              {profile ? `${profile.full_name?.split(" ")[0]}'s farms` : "Your farms"}
            </h1>
            <p className="text-sm text-[#5a5a57] mt-0.5">
              {loading ? "Loading…" : `${farms.length} farm${farms.length !== 1 ? "s" : ""} on your account`}
            </p>
          </div>
          <Link
            to="/farms/new"
            className="inline-flex items-center gap-2 bg-[#1a4d2e] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#2d7a4f] transition-colors self-start sm:self-auto"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add farm
          </Link>
        </div>

        {/* Stats */}
        {!loading && farms.length > 0 && <StatsBar farms={farms} />}

        {/* Filters */}
        {!loading && farms.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8a87]" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </span>
              <input
                type="search"
                placeholder="Search farms…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-[#d8d8d4] rounded-lg pl-8 pr-3 py-2 text-sm text-[#1c1c1a] placeholder-[#b0a0ac] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                aria-label="Search farms"
              />
            </div>

            {/* Crop filter */}
            <select
              value={cropFilter}
              onChange={(e) => setCropFilter(e.target.value)}
              className="bg-white border border-[#d8d8d4] rounded-lg px-3 py-2 text-sm text-[#1c1c1a] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] capitalize"
              aria-label="Filter by crop type"
            >
              {cropTypes.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c === "all" ? "All crops" : c}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-white border border-[#d8d8d4] rounded-lg px-3 py-2 text-sm text-[#1c1c1a] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
              aria-label="Sort farms"
            >
              <option value="updated">Recently updated</option>
              <option value="area">Largest first</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        )}

        {/* Farm grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : farms.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#5a5a57]">
            <p className="text-sm">No farms match your search.</p>
            <button
              onClick={() => { setSearch(""); setCropFilter("all"); }}
              className="text-sm text-[#1a4d2e] font-medium mt-2 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((farm) => <FarmCard key={farm.id} farm={farm} onDelete={handleDeleteFarm} />)}
          </div>
        )}

        {/* Delete confirmation dialog */}
        <ConfirmDialog
          open={deleteConfirmOpen}
          title="Delete farm"
          message={`Are you sure you want to delete "${farms.find((f) => f.id === farmToDelete)?.name}"? This will also remove all associated plans and roads. This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Keep"
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleteConfirmOpen(false);
            setFarmToDelete(null);
          }}
        />
      </main>
    </div>
  );
}
