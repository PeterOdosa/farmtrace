import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

// ─── Animated polygon hero SVG ───────────────────────────────────────────────
function PolygonHero() {
  const [progress, setProgress] = useState(0);

  const points = [
    [260, 80],
    [420, 110],
    [460, 240],
    [380, 320],
    [200, 300],
    [140, 180],
  ];

  useEffect(() => {
    let frame: number;
    let start: number | null = null;
    const duration = 2200;

    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p < 1) frame = requestAnimationFrame(animate);
    };

    const timeout = setTimeout(() => {
      frame = requestAnimationFrame(animate);
    }, 400);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, []);

  const totalPoints = points.length;
  const visibleCount = progress * totalPoints;

  const buildPath = () => {
    const visible = points.slice(0, Math.ceil(visibleCount));
    if (visible.length < 2) return "";
    let d = `M ${visible[0][0]} ${visible[0][1]}`;
    for (let i = 1; i < visible.length; i++) {
      const frac = Math.min(1, visibleCount - (i - 1));
      const prev = visible[i - 1];
      const curr = visible[i];
      const x = prev[0] + (curr[0] - prev[0]) * frac;
      const y = prev[1] + (curr[1] - prev[1]) * frac;
      d += ` L ${x} ${y}`;
    }
    if (progress === 1) d += " Z";
    return d;
  };

  return (
    <div className="relative w-full flex items-center justify-center">
      <svg
        viewBox="0 0 600 400"
        className="w-full max-w-lg"
        aria-label="Animated farm polygon mapping illustration"
        role="img"
      >
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#2d7a4f"
              strokeWidth="0.5"
              opacity="0.3"
            />
          </pattern>
        </defs>
        <rect width="600" height="400" fill="#0f3320" rx="16" />
        <rect width="600" height="400" fill="url(#grid)" rx="16" />

        {/* Polygon fill — only when closed */}
        {progress === 1 && (
          <polygon
            points={points.map((p) => p.join(",")).join(" ")}
            fill="#2d7a4f"
            opacity="0.25"
          />
        )}

        {/* Polygon stroke path */}
        <path
          d={buildPath()}
          fill="none"
          stroke="#c8a96e"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots at each vertex */}
        {points.slice(0, Math.ceil(visibleCount)).map((pt, i) => (
          <circle
            key={i}
            cx={pt[0]}
            cy={pt[1]}
            r="5"
            fill="#c8a96e"
            opacity={i < Math.floor(visibleCount) ? 1 : 0.5}
          />
        ))}

        {/* Area label — only when polygon is closed */}
        {progress === 1 && (
          <g>
            <rect x="232" y="178" width="136" height="44" rx="8" fill="#1a4d2e" opacity="0.9" />
            <text x="300" y="197" textAnchor="middle" fill="#c8a96e" fontSize="11" fontFamily="Inter, sans-serif">
              Total area
            </text>
            <text x="300" y="215" textAnchor="middle" fill="#f7f5f0" fontSize="14" fontWeight="600" fontFamily="Inter, sans-serif">
              12.4 ha · 30.6 ac
            </text>
          </g>
        )}

        {/* Live dot */}
        {progress === 1 && (
          <g>
            <circle cx="310" cy="190" r="8" fill="#4ade80" opacity="0.25" />
            <circle cx="310" cy="190" r="4" fill="#4ade80" />
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#1a4d2e] flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2L13 5.5V10.5L8 14L3 10.5V5.5L8 2Z" stroke="#c8a96e" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="8" cy="8" r="1.5" fill="#c8a96e" />
          </svg>
        </div>
        <span className="font-semibold text-[#1c1c1a] text-base tracking-tight">FarmTrace</span>
      </div>
      <div className="hidden md:flex items-center gap-6 text-sm text-[#4a4a48]">
        <a href="#features" className="hover:text-[#1a4d2e] transition-colors">Features</a>
        <a href="#how-it-works" className="hover:text-[#1a4d2e] transition-colors">How it works</a>
        <a href="#pricing" className="hover:text-[#1a4d2e] transition-colors">Pricing</a>
      </div>
      <div className="flex items-center gap-3">
        <Link
          to="/login"
          className="text-sm text-[#1c1c1a] hover:text-[#1a4d2e] transition-colors font-medium"
        >
          Sign in
        </Link>
        <Link
          to="/signup"
          className="text-sm bg-[#1a4d2e] text-white px-4 py-2 rounded-lg hover:bg-[#2d7a4f] transition-colors font-medium"
        >
          Get started
        </Link>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="w-full max-w-6xl mx-auto px-6 pt-12 pb-20 grid md:grid-cols-2 gap-12 items-center">
      <div>
        <div className="inline-flex items-center gap-2 bg-[#e8f0e9] text-[#1a4d2e] text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2d7a4f]" aria-hidden="true" />
          Now in beta — free for early farmers
        </div>
        <h1
          className="text-4xl md:text-5xl font-bold leading-tight text-[#1c1c1a] mb-5"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Map your land.
          <br />
          <span className="text-[#1a4d2e]">Plan what grows.</span>
        </h1>
        <p className="text-base text-[#4a4a48] leading-relaxed mb-8 max-w-md">
          Walk your boundary and FarmTrace maps it. Then design your entire
          farm — roads, buildings, planting zones — in a drag-and-drop studio
          built for African agriculture.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 bg-[#1a4d2e] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#2d7a4f] transition-colors text-sm"
          >
            Start mapping free
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 border border-[#d0d0cc] text-[#1c1c1a] px-6 py-3 rounded-lg font-medium hover:bg-[#f0ede8] transition-colors text-sm"
          >
            See how it works
          </a>
        </div>
        <p className="text-xs text-[#8a8a87] mt-4">
          No credit card required · Works offline on mobile
        </p>
      </div>
      <div className="bg-[#0f3320] rounded-2xl p-4 shadow-xl">
        <PolygonHero />
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path d="M11 2L19 6.5V15.5L11 20L3 15.5V6.5L11 2Z" stroke="#1a4d2e" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="11" cy="11" r="2" fill="#1a4d2e" />
      </svg>
    ),
    title: "Walk-to-map boundary capture",
    body:
      "Open the app, press start, and walk your perimeter. FarmTrace draws your polygon in real time using GPS — no surveying equipment needed.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="16" height="16" rx="3" stroke="#1a4d2e" strokeWidth="1.5" />
        <path d="M7 11h8M11 7v8" stroke="#1a4d2e" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Drag-and-drop farm planning studio",
    body:
      "Place roads, buildings, boreholes, and planting zones on a live map canvas. Oil palm, maize, cassava — presets handle the spacing automatically.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="8" stroke="#1a4d2e" strokeWidth="1.5" />
        <circle cx="11" cy="11" r="2.5" fill="#1a4d2e" />
        <path d="M11 3v2M11 17v2M3 11h2M17 11h2" stroke="#1a4d2e" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Live positioning on your farm",
    body:
      "See exactly where you are standing inside your mapped polygon — like Google Maps, but on your own land. Toggle between boundary, roads, and your plan.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path d="M4 6h14M4 11h14M4 16h8" stroke="#1a4d2e" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="17" cy="16" r="3" stroke="#1a4d2e" strokeWidth="1.5" />
      </svg>
    ),
    title: "Agronomist collaboration",
    body:
      "Invite an agronomist to plan your farm remotely. They design on the web; you see the result live on your phone. Set who can edit and who can only view.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path d="M6 2h10l4 4v14a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="#1a4d2e" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M14 2v5h5M8 13h6M8 17h4" stroke="#1a4d2e" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Import any GPS file",
    body:
      "Already have a polygon from another GPS device? Import GeoJSON, KML, KMZ, or Shapefile and continue planning right where you left off.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path d="M2 11a9 9 0 1118 0 9 9 0 01-18 0z" stroke="#1a4d2e" strokeWidth="1.5" />
        <path d="M2 11h4m10 0h4M11 2v4m0 10v4" stroke="#1a4d2e" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="11" cy="11" r="2" fill="#1a4d2e" />
      </svg>
    ),
    title: "Fully offline on mobile",
    body:
      "No signal? No problem. FarmTrace works without internet. Your maps and plans sync automatically the moment you're back online.",
  },
];

function Features() {
  return (
    <section id="features" className="w-full bg-[#f7f5f0] py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-[#2d7a4f] uppercase tracking-widest mb-3">
            Features
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold text-[#1c1c1a]"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Everything your farm needs,
            <br />
            <span className="text-[#1a4d2e]">in one place</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-6 border border-[#e4e4e0] hover:border-[#2d7a4f] transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-[#e8f0e9] flex items-center justify-center mb-4 group-hover:bg-[#d0e8d5] transition-colors">
                {f.icon}
              </div>
              <h3 className="font-semibold text-[#1c1c1a] text-sm mb-2">{f.title}</h3>
              <p className="text-sm text-[#5a5a57] leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
const steps = [
  {
    step: "01",
    heading: "Map your land boundary",
    body: "Walk your farm perimeter with the mobile app. FarmTrace records your GPS path and generates a polygon — complete with area, perimeter, and side-by-side measurements — the moment you close the loop.",
    detail: "Works offline. Supports walk mode and manual pin mode.",
  },
  {
    step: "02",
    heading: "Design your farm layout",
    body: "Open the web planning studio and drag roads, buildings, water points, and planting zones onto your polygon. Oil palm, maize, cassava — select a crop and the planting pattern fills in automatically.",
    detail: "Supports GeoJSON, KML, KMZ, and Shapefile import.",
  },
  {
    step: "03",
    heading: "Navigate with your plan",
    body: "Back on the farm? Open the app and toggle between your boundary, road network, and full planned layout. A live dot shows exactly where you are standing — inside your own design.",
    detail: "Real-time sync between web plan and mobile app.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-[#2d7a4f] uppercase tracking-widest mb-3">
            How it works
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold text-[#1c1c1a]"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            From bare land to
            <br />
            <span className="text-[#1a4d2e]">working farm plan</span>
          </h2>
        </div>
        <div className="flex flex-col gap-0">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`grid md:grid-cols-2 gap-10 items-center py-14 ${i < steps.length - 1 ? "border-b border-[#e4e4e0]" : ""}`}
            >
              <div className={i % 2 === 1 ? "md:order-2" : ""}>
                <span
                  className="text-5xl font-bold text-[#e8f0e9] block mb-4 leading-none"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                  aria-hidden="true"
                >
                  {s.step}
                </span>
                <h3
                  className="text-2xl font-bold text-[#1c1c1a] mb-3"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                >
                  {s.heading}
                </h3>
                <p className="text-[#4a4a48] leading-relaxed mb-3 text-sm">{s.body}</p>
                <p className="text-xs text-[#2d7a4f] font-medium">{s.detail}</p>
              </div>
              <div className={`bg-[#0f3320] rounded-2xl h-52 flex items-center justify-center ${i % 2 === 1 ? "md:order-1" : ""}`}>
                <span
                  className="text-7xl font-bold opacity-10 text-white select-none"
                  style={{ fontFamily: "'DM Serif Display', serif" }}
                  aria-hidden="true"
                >
                  {s.step}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Social proof strip ────────────────────────────────────────────────────────
function ProofStrip() {
  return (
    <section className="w-full bg-[#1a4d2e] py-14">
      <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-center">
        {[
          { stat: "12.4 ha", label: "Average farm mapped in first session" },
          { stat: "< 60 s", label: "Time to generate a boundary polygon" },
          { stat: "3 crops", label: "Planting presets available at launch" },
        ].map((item, i) => (
          <div key={i}>
            <div
              className="text-4xl font-bold text-[#c8a96e] mb-2"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              {item.stat}
            </div>
            <div className="text-sm text-[#9dc9ae]">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section className="w-full py-24 bg-[#f7f5f0]">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h2
          className="text-3xl md:text-4xl font-bold text-[#1c1c1a] mb-4"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Your farm deserves
          a proper plan.
        </h2>
        <p className="text-[#4a4a48] text-sm leading-relaxed mb-8 max-w-md mx-auto">
          Join farmers and agronomists across Africa using FarmTrace to map, plan,
          and manage their land with confidence.
        </p>
        <Link
          to="/signup"
          className="inline-flex items-center gap-2 bg-[#1a4d2e] text-white px-8 py-3.5 rounded-lg font-medium hover:bg-[#2d7a4f] transition-colors text-sm"
        >
          Start for free
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <p className="text-xs text-[#8a8a87] mt-4">No credit card required</p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="w-full border-t border-[#e4e4e0] bg-white py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#1a4d2e] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2L13 5.5V10.5L8 14L3 10.5V5.5L8 2Z" stroke="#c8a96e" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[#1c1c1a]">FarmTrace</span>
        </div>
        <p className="text-xs text-[#8a8a87]">
          © {new Date().getFullYear()} FarmTrace. Built for African agriculture.
        </p>
        <div className="flex gap-5 text-xs text-[#8a8a87]">
          <a href="/privacy" className="hover:text-[#1a4d2e] transition-colors">Privacy</a>
          <a href="/terms" className="hover:text-[#1a4d2e] transition-colors">Terms</a>
          <a href="mailto:hello@farmtrace.app" className="hover:text-[#1a4d2e] transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}

// ─── Scroll-to-top button ─────────────────────────────────────────────────────
function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={`fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-[#1a4d2e] text-white shadow-lg flex items-center justify-center hover:bg-[#2d7a4f] transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 10l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <FontLoader />
      <Nav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <ProofStrip />
        <CTA />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
