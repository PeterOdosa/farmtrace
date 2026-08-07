import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// ─── Scroll to top ────────────────────────────────────────────────────────────
function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={`fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-[#1a4d2e] text-white flex items-center justify-center shadow-lg hover:bg-[#2d7a4f] transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 12V4M4 8l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

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
        <a href="#organizations" className="hover:text-[#1a4d2e] transition-colors">For organizations</a>
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


// ─── For organizations ────────────────────────────────────────────────────────
function ForOrganizations() {
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", org: "", email: "", message: "" });
  const [formState, setFormState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("sending");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: "YOUR_WEB3FORMS_ACCESS_KEY", // ← replace with your key from web3forms.com
          subject: `FarmTrace org inquiry from ${formData.org}`,
          from_name: formData.name,
          ...formData,
        }),
      });
      if (res.ok) {
        setFormState("sent");
      } else {
        setFormState("error");
      }
    } catch {
      setFormState("error");
    }
  };

  const updateField = (field: string, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  return (
    <section id="organizations" className="w-full py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-14 items-start">

          {/* Left — copy + CTAs */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[#e8f0e9] text-[#1a4d2e] text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2d7a4f]" aria-hidden="true" />
              For agricultural organizations
            </div>
            <h2
              className="text-3xl md:text-4xl font-bold text-[#1c1c1a] mb-5 leading-tight"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              Deploy FarmTrace
              <br />
              <span className="text-[#1a4d2e]">across your entire operation.</span>
            </h2>
            <p className="text-sm text-[#4a4a48] leading-relaxed mb-8 max-w-md">
              FarmTrace is built for agricultural companies, cooperatives, and
              development organizations who need a unified tool for their farmers
              and agronomists. One workspace. Every farm. One dashboard.
            </p>

            {/* Benefit list */}
            <ul className="flex flex-col gap-4 mb-10">
              {[
                {
                  title: "Organization workspace",
                  body: "All your farmers and agronomists under one account. Add members with an invite code — no IT setup required.",
                },
                {
                  title: "Remote agronomist planning",
                  body: "Your agronomists design farm layouts from the office. Farmers see the plan live on their phones in the field.",
                },
                {
                  title: "Full data ownership",
                  body: "Every polygon, plan, and measurement belongs to your organization. Export anytime in standard GIS formats.",
                },
                {
                  title: "Scales with your portfolio",
                  body: "Whether you manage 10 farms or 10,000 — FarmTrace handles the load. Pricing is tailored to your scale.",
                },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#1a4d2e] flex items-center justify-center shrink-0 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                      <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1c1c1a] mb-0.5">{item.title}</p>
                    <p className="text-sm text-[#5a5a57] leading-relaxed">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Primary CTA — Calendly */}
            <a
              href="https://calendly.com/YOUR_CALENDLY_LINK"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#1a4d2e] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#2d7a4f] transition-colors mb-4"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                <rect x="1" y="2" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
                <path d="M1 6h13M5 1v2M10 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M4 9h2v2H4z" fill="currentColor" />
              </svg>
              Book a 20-minute call
            </a>

            {/* Secondary CTA — toggle contact form */}
            <div>
              <button
                type="button"
                onClick={() => setFormOpen(!formOpen)}
                className="text-sm text-[#1a4d2e] font-medium hover:underline flex items-center gap-1.5"
                aria-expanded={formOpen}
                aria-controls="contact-form"
              >
                {formOpen ? "Hide form" : "Prefer to send a message instead?"}
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                  className={`transition-transform ${formOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                >
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Inline contact form */}
              {formOpen && (
                <div id="contact-form" className="mt-5">
                  {formState === "sent" ? (
                    <div className="bg-[#e8f0e9] border border-[#2d7a4f] rounded-xl px-5 py-6 text-center">
                      <div className="w-10 h-10 rounded-full bg-[#1a4d2e] flex items-center justify-center mx-auto mb-3">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                          <path d="M3.5 9l4 4 7-7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-[#1a4d2e] mb-1">Message sent!</p>
                      <p className="text-xs text-[#4a4a48]">We'll get back to you within 1 business day.</p>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleSubmit}
                      noValidate
                      className="bg-[#f7f5f0] border border-[#e4e4e0] rounded-xl p-5 flex flex-col gap-3"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="contact-name" className="block text-xs font-medium text-[#3a3a38] mb-1.5">
                            Your name
                          </label>
                          <input
                            id="contact-name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => updateField("name", e.target.value)}
                            placeholder="Adebayo Okafor"
                            className="w-full bg-white border border-[#d8d8d4] rounded-lg px-3 py-2 text-sm text-[#1c1c1a] placeholder-[#b0b0ac] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label htmlFor="contact-org" className="block text-xs font-medium text-[#3a3a38] mb-1.5">
                            Organization
                          </label>
                          <input
                            id="contact-org"
                            type="text"
                            required
                            value={formData.org}
                            onChange={(e) => updateField("org", e.target.value)}
                            placeholder="Agrico Ltd"
                            className="w-full bg-white border border-[#d8d8d4] rounded-lg px-3 py-2 text-sm text-[#1c1c1a] placeholder-[#b0b0ac] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="contact-email" className="block text-xs font-medium text-[#3a3a38] mb-1.5">
                          Work email
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => updateField("email", e.target.value)}
                          placeholder="you@company.com"
                          className="w-full bg-white border border-[#d8d8d4] rounded-lg px-3 py-2 text-sm text-[#1c1c1a] placeholder-[#b0b0ac] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label htmlFor="contact-message" className="block text-xs font-medium text-[#3a3a38] mb-1.5">
                          Message <span className="text-[#8a8a87] font-normal">(optional)</span>
                        </label>
                        <textarea
                          id="contact-message"
                          rows={3}
                          value={formData.message}
                          onChange={(e) => updateField("message", e.target.value)}
                          placeholder="Tell us about your organization and how many farms you manage…"
                          className="w-full bg-white border border-[#d8d8d4] rounded-lg px-3 py-2 text-sm text-[#1c1c1a] placeholder-[#b0b0ac] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent resize-none"
                        />
                      </div>

                      {formState === "error" && (
                        <p className="text-xs text-red-600" role="alert">
                          Something went wrong — please try again or email us directly at hello@farmtrace.app
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={formState === "sending"}
                        className="w-full bg-[#1a4d2e] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#2d7a4f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {formState === "sending" ? (
                          <>
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                              <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                            Sending…
                          </>
                        ) : (
                          "Send message"
                        )}
                      </button>
                      <p className="text-[10px] text-[#8a8a87] text-center">
                        We'll respond within 1 business day. No spam, ever.
                      </p>
                    </form>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-[#8a8a87] mt-6">
              Pricing is tailored to your organization's size — no public tiers, no surprises.
            </p>
          </div>

          {/* Right — org dashboard illustration */}
          <div className="bg-[#0f3320] rounded-2xl p-6 shadow-xl sticky top-8">
            <svg viewBox="0 0 380 300" className="w-full" aria-label="Organization dashboard illustration" role="img">
              <defs>
                <pattern id="org-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#2d7a4f" strokeWidth="0.4" opacity="0.4" />
                </pattern>
              </defs>
              <rect width="380" height="300" fill="#0f3320" rx="12" />
              <rect width="380" height="300" fill="url(#org-grid)" rx="12" />
              {/* Header bar */}
              <rect x="16" y="16" width="348" height="36" rx="8" fill="#1a4d2e" opacity="0.9" />
              <circle cx="36" cy="34" r="8" fill="#2d7a4f" />
              <rect x="52" y="28" width="60" height="6" rx="3" fill="#9dc9ae" opacity="0.6" />
              <rect x="260" y="26" width="48" height="10" rx="5" fill="#c8a96e" opacity="0.9" />
              <rect x="314" y="26" width="36" height="10" rx="5" fill="#2d7a4f" />
              {/* Stat cards */}
              {[0,1,2,3].map((i) => (
                <g key={i}>
                  <rect x={16 + i * 88} y="66" width="78" height="48" rx="6" fill="#1a4d2e" opacity="0.7" />
                  <rect x={24 + i * 88} y="76" width="30" height="5" rx="2.5" fill="#9dc9ae" opacity="0.5" />
                  <rect x={24 + i * 88} y="87" width={[40,32,46,28][i]} height="8" rx="4" fill="#c8a96e" opacity="0.8" />
                  <rect x={24 + i * 88} y="101" width={[20,28,18,24][i]} height="4" rx="2" fill="#4ade80" opacity="0.4" />
                </g>
              ))}
              {/* Farm cards */}
              {[0,1,2].map((i) => (
                <g key={i}>
                  <rect x={16 + i * 122} y="130" width="110" height="80" rx="6" fill="#1a4d2e" opacity="0.6" />
                  <polygon
                    points={`${46 + i*122},145 ${76 + i*122},148 ${82 + i*122},168 ${64 + i*122},178 ${42 + i*122},165`}
                    fill="#2d7a4f" opacity="0.4"
                  />
                  <polygon
                    points={`${46 + i*122},145 ${76 + i*122},148 ${82 + i*122},168 ${64 + i*122},178 ${42 + i*122},165`}
                    fill="none" stroke="#c8a96e" strokeWidth="1"
                  />
                  <rect x={24 + i * 122} y="185" width={[55,48,62][i]} height="5" rx="2.5" fill="#9dc9ae" opacity="0.6" />
                  <rect x={24 + i * 122} y="196" width={[38,44,30][i]} height="4" rx="2" fill="#9dc9ae" opacity="0.3" />
                </g>
              ))}
              {/* Member list */}
              <rect x="16" y="224" width="348" height="60" rx="6" fill="#1a4d2e" opacity="0.5" />
              {[0,1,2,3,4].map((i) => (
                <g key={i}>
                  <circle cx={32} cy={244 + i * 10} r="4" fill="#c8a96e" opacity="0.5" />
                  <rect x="42" y={241 + i * 10} width={[80,65,90,55,72][i]} height="4" rx="2" fill="#9dc9ae" opacity={i === 0 ? 0.6 : 0.3} />
                  <rect x={300} y={241 + i * 10} width="36" height="4" rx="2" fill={["#c8a96e","#4ade80","#c8a96e","#4ade80","#9dc9ae"][i]} opacity="0.5" />
                </g>
              ))}
            </svg>
          </div>

        </div>
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
        <ForOrganizations />
        <CTA />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
