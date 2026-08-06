import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

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

// ─── Left panel ───────────────────────────────────────────────────────────────
function MapPanel({ step }: { step: 1 | 2 }) {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-[#0f3320] flex-col items-center justify-center p-12 relative overflow-hidden">
      {/* Grid */}
      <svg className="absolute inset-0 w-full h-full opacity-20" aria-hidden="true">
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#2d7a4f" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Illustration — changes by step */}
      <svg
        viewBox="0 0 400 360"
        className="w-full max-w-sm relative z-10"
        aria-hidden="true"
      >
        {/* Base polygon — always shown */}
        <polygon
          points="200,60 320,120 300,260 160,290 80,200 120,100"
          fill="#2d7a4f"
          opacity="0.3"
        />
        <polygon
          points="200,60 320,120 300,260 160,290 80,200 120,100"
          fill="none"
          stroke="#c8a96e"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {[[200,60],[320,120],[300,260],[160,290],[80,200],[120,100]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="5" fill="#c8a96e" />
        ))}

        {step === 1 ? (
          /* Step 1 — bare land, just the polygon */
          <>
            <rect x="140" y="158" width="120" height="44" rx="8" fill="#1a4d2e" opacity="0.95" />
            <text x="200" y="177" textAnchor="middle" fill="#c8a96e" fontSize="10" fontFamily="Inter, sans-serif">Your land</text>
            <text x="200" y="195" textAnchor="middle" fill="#f7f5f0" fontSize="13" fontWeight="600" fontFamily="Inter, sans-serif">Ready to map</text>
          </>
        ) : (
          /* Step 2 — land with roads + planting dots to hint at planning */
          <>
            {/* Roads */}
            <path d="M 120 100 L 80 50" stroke="#9dc9ae" strokeWidth="2" strokeDasharray="5 3" strokeLinecap="round" />
            <path d="M 200 60 L 200 160" stroke="#9dc9ae" strokeWidth="2" strokeDasharray="5 3" strokeLinecap="round" />
            {/* Planting dots */}
            {[
              [155,145],[175,145],[195,145],[215,145],[235,145],
              [155,165],[175,165],[195,165],[215,165],[235,165],
              [155,185],[175,185],[195,185],[215,185],[235,185],
            ].map(([x,y],i) => (
              <circle key={i} cx={x} cy={y} r="3" fill="#c8a96e" opacity="0.6" />
            ))}
            {/* Label */}
            <rect x="230" y="80" width="110" height="44" rx="8" fill="#1a4d2e" opacity="0.95" />
            <text x="285" y="99" textAnchor="middle" fill="#c8a96e" fontSize="10" fontFamily="Inter, sans-serif">Your role</text>
            <text x="285" y="117" textAnchor="middle" fill="#f7f5f0" fontSize="13" fontWeight="600" fontFamily="Inter, sans-serif">Map + Plan</text>
          </>
        )}
      </svg>

      {/* Quote — changes by step */}
      <div className="relative z-10 mt-8 text-center max-w-xs">
        {step === 1 ? (
          <>
            <p
              className="text-2xl font-bold text-white leading-snug mb-3"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              "Your land, mapped<br />and planned."
            </p>
            <p className="text-sm text-[#9dc9ae]">
              Start with your boundary. Build from there.
            </p>
          </>
        ) : (
          <>
            <p
              className="text-2xl font-bold text-white leading-snug mb-3"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              "Every farm needs<br />a good plan."
            </p>
            <p className="text-sm text-[#9dc9ae]">
              Tell us your role and we'll set up the right workspace for you.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-8" aria-label={`Step ${step} of 2`}>
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
              s < step
                ? "bg-[#1a4d2e] text-white"
                : s === step
                ? "bg-[#1a4d2e] text-white ring-4 ring-[#e8f0e9]"
                : "bg-[#e4e4e0] text-[#8a8a87]"
            }`}
            aria-current={s === step ? "step" : undefined}
          >
            {s < step ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : s}
          </div>
          {s < 2 && <div className={`w-10 h-px ${s < step ? "bg-[#1a4d2e]" : "bg-[#e4e4e0]"}`} />}
        </div>
      ))}
      <span className="text-xs text-[#8a8a87] ml-1">Step {step} of 2</span>
    </div>
  );
}

// ─── Role card ────────────────────────────────────────────────────────────────
function RoleCard({
  role,
  selected,
  onSelect,
  icon,
  title,
  description,
}: {
  role: string;
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left border rounded-xl p-4 transition-all focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] ${
        selected
          ? "border-[#1a4d2e] bg-[#e8f0e9] ring-1 ring-[#1a4d2e]"
          : "border-[#d8d8d4] bg-white hover:border-[#2d7a4f] hover:bg-[#f4faf5]"
      }`}
      aria-pressed={selected}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            selected ? "bg-[#1a4d2e] text-white" : "bg-[#f0f0ec] text-[#4a4a48]"
          }`}
        >
          {icon}
        </div>
        <div>
          <p className={`text-sm font-semibold mb-0.5 ${selected ? "text-[#1a4d2e]" : "text-[#1c1c1a]"}`}>
            {title}
          </p>
          <p className="text-xs text-[#5a5a57] leading-relaxed">{description}</p>
        </div>
        {selected && (
          <div className="ml-auto shrink-0">
            <div className="w-4 h-4 rounded-full bg-[#1a4d2e] flex items-center justify-center">
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
                <path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Signup page ──────────────────────────────────────────────────────────────
export default function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 fields
  const [role, setRole] = useState<"farmer" | "agronomist" | "">("");
  const [orgCode, setOrgCode] = useState("");
  const [orgValid, setOrgValid] = useState<boolean | null>(null);
  const [checkingOrg, setCheckingOrg] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Step 1 validation ──────────────────────────────────────────────────────
  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (!email.trim()) { setError("Please enter your email."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setStep(2);
  };

  // ── Org code check ─────────────────────────────────────────────────────────
  const handleCheckOrg = async () => {
    if (!orgCode.trim()) return;
    setCheckingOrg(true);
    const { data } = await supabase
      .from("organizations")
      .select("id")
      .eq("invite_code", orgCode.trim().toUpperCase())
      .single();
    setOrgValid(!!data);
    setCheckingOrg(false);
  };

  // ── Final submit ───────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) { setError("Please select your role."); return; }
    setError(null);
    setLoading(true);

    // Sign up with Supabase Auth
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (authError || !data.user) {
      setError(authError?.message ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    // Resolve org id from code if provided
    let organizationId: string | null = null;
    if (orgCode.trim() && orgValid) {
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("invite_code", orgCode.trim().toUpperCase())
        .single();
      organizationId = org?.id ?? null;
    }

    // Write profile row
    await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
      role,
      organization_id: organizationId,
    });

    setLoading(false);
    navigate("/dashboard");
  };

  const handleGoogleSignup = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  return (
    <div className="min-h-screen flex font-sans">
      <FontLoader />
      <MapPanel step={step} />

      {/* Right panel */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-6 py-12 bg-[#f7f5f0]">
        <div className="w-full max-w-sm">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-[#1a4d2e] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 2L13 5.5V10.5L8 14L3 10.5V5.5L8 2Z" stroke="#c8a96e" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="8" cy="8" r="1.5" fill="#c8a96e" />
              </svg>
            </div>
            <span className="font-semibold text-[#1c1c1a] text-base tracking-tight">FarmTrace</span>
          </Link>

          <StepIndicator step={step} />

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-5"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <>
              <h1
                className="text-3xl font-bold text-[#1c1c1a] mb-1"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                Create your account
              </h1>
              <p className="text-sm text-[#5a5a57] mb-7">
                Start mapping your land in minutes
              </p>

              <form onSubmit={handleStep1} noValidate className="flex flex-col gap-4">
                {/* Full name */}
                <div>
                  <label htmlFor="fullName" className="block text-xs font-medium text-[#3a3a38] mb-1.5">
                    Full name
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8a87]" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <circle cx="7.5" cy="5" r="3" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M1.5 14c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    </span>
                    <input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Adebayo Okafor"
                      className="w-full bg-white border border-[#d8d8d4] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#1c1c1a] placeholder-[#b0b0ac] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent transition"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-[#3a3a38] mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8a87]" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path d="M1 3.5h13v9H1v-9zM1 3.5l6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-white border border-[#d8d8d4] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#1c1c1a] placeholder-[#b0b0ac] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent transition"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-xs font-medium text-[#3a3a38] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8a87]" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <rect x="2" y="6" width="11" height="8" rx="2" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M5 6V4a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    </span>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full bg-white border border-[#d8d8d4] rounded-lg pl-9 pr-10 py-2.5 text-sm text-[#1c1c1a] placeholder-[#b0b0ac] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8a87] hover:text-[#1a4d2e] transition-colors"
                    >
                      {showPassword ? (
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <path d="M1 7.5S3.5 3 7.5 3s6.5 4.5 6.5 4.5S11.5 12 7.5 12 1 7.5 1 7.5z" stroke="currentColor" strokeWidth="1.2" />
                          <circle cx="7.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                          <path d="M2 2l11 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <path d="M1 7.5S3.5 3 7.5 3s6.5 4.5 6.5 4.5S11.5 12 7.5 12 1 7.5 1 7.5z" stroke="currentColor" strokeWidth="1.2" />
                          <circle cx="7.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {/* Password strength hint */}
                  {password.length > 0 && (
                    <div className="mt-1.5 flex gap-1">
                      {[1,2,3].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            password.length >= i * 4
                              ? password.length >= 10 ? "bg-[#1a4d2e]" : "bg-amber-400"
                              : "bg-[#e4e4e0]"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#1a4d2e] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#2d7a4f] transition-colors flex items-center justify-center gap-2 mt-1"
                >
                  Continue
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                    <path d="M2 6.5h9M8 3l3.5 3.5L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-[#e0e0dc]" />
                <span className="text-xs text-[#a0a09c]">or</span>
                <div className="flex-1 h-px bg-[#e0e0dc]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignup}
                className="w-full flex items-center justify-center gap-3 bg-white border border-[#d8d8d4] text-[#1c1c1a] py-2.5 rounded-lg text-sm font-medium hover:bg-[#f0ede8] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.3a3.67 3.67 0 01-1.6 2.41v2h2.6c1.52-1.4 2.38-3.46 2.38-5.87z" fill="#4285F4" />
                  <path d="M8 16c2.16 0 3.97-.72 5.3-1.95l-2.6-2a4.77 4.77 0 01-2.7.75 4.76 4.76 0 01-4.48-3.29H.84v2.06A8 8 0 008 16z" fill="#34A853" />
                  <path d="M3.52 9.51A4.8 4.8 0 013.27 8c0-.52.09-1.03.25-1.51V4.43H.84A8 8 0 000 8c0 1.29.31 2.51.84 3.57l2.68-2.06z" fill="#FBBC05" />
                  <path d="M8 3.18c1.22 0 2.31.42 3.17 1.24l2.37-2.37A8 8 0 00.84 4.43L3.52 6.5A4.76 4.76 0 018 3.18z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              <p className="text-center text-xs text-[#5a5a57] mt-8">
                Already have an account?{" "}
                <Link to="/login" className="text-[#1a4d2e] font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <>
              <h1
                className="text-3xl font-bold text-[#1c1c1a] mb-1"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                Your role
              </h1>
              <p className="text-sm text-[#5a5a57] mb-7">
                How will you use FarmTrace?
              </p>

              <form onSubmit={handleSignup} noValidate className="flex flex-col gap-5">
                {/* Role selection */}
                <div className="flex flex-col gap-3" role="group" aria-label="Select your role">
                  <RoleCard
                    role="farmer"
                    selected={role === "farmer"}
                    onSelect={() => setRole("farmer")}
                    icon={
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                        <path d="M9 2L16 6v6l-7 4-7-4V6l9-4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                        <circle cx="9" cy="9" r="2" fill="currentColor" />
                      </svg>
                    }
                    title="Farmer"
                    description="Map your land boundaries, plan your farm layout, and navigate on the ground."
                  />
                  <RoleCard
                    role="agronomist"
                    selected={role === "agronomist"}
                    onSelect={() => setRole("agronomist")}
                    icon={
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                        <rect x="2" y="2" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M5 9h8M9 5v8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                    }
                    title="Agronomist"
                    description="Plan farms remotely for clients. Manage multiple farmer accounts from one dashboard."
                  />
                </div>

                {/* Org code */}
                <div>
                  <label htmlFor="orgCode" className="block text-xs font-medium text-[#3a3a38] mb-1.5">
                    Organization code{" "}
                    <span className="text-[#8a8a87] font-normal">(optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8a87]" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <rect x="1" y="3" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.2" />
                          <path d="M4 3V2a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      </span>
                      <input
                        id="orgCode"
                        type="text"
                        value={orgCode}
                        onChange={(e) => { setOrgCode(e.target.value.toUpperCase()); setOrgValid(null); }}
                        placeholder="e.g. AGRICO-2024"
                        className="w-full bg-white border border-[#d8d8d4] rounded-lg pl-8 pr-3 py-2.5 text-sm text-[#1c1c1a] placeholder-[#b0b0ac] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent transition uppercase tracking-wider"
                        aria-describedby="org-status"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCheckOrg}
                      disabled={!orgCode.trim() || checkingOrg}
                      className="px-3 py-2.5 bg-[#e8f0e9] text-[#1a4d2e] text-sm font-medium rounded-lg hover:bg-[#d0e8d5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                      {checkingOrg ? "…" : "Apply"}
                    </button>
                  </div>
                  {/* Org feedback */}
                  <div id="org-status" className="mt-1.5 min-h-[16px]">
                    {orgValid === true && (
                      <p className="text-xs text-[#1a4d2e] font-medium flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                          <circle cx="6" cy="6" r="5" fill="#1a4d2e" />
                          <path d="M3.5 6l1.5 1.5 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Organization found — you'll be added to their workspace
                      </p>
                    )}
                    {orgValid === false && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                          <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        Code not found — you can still sign up without one
                      </p>
                    )}
                    {orgValid === null && orgCode.length === 0 && (
                      <p className="text-[10px] text-[#8a8a87]">
                        Have a code from your company or cooperative? Enter it here.
                      </p>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(null); }}
                    className="flex-1 border border-[#d8d8d4] text-[#1c1c1a] py-2.5 rounded-lg text-sm font-medium hover:bg-[#f0ede8] transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !role}
                    className="flex-1 bg-[#1a4d2e] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#2d7a4f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                          <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        Creating account…
                      </>
                    ) : (
                      "Create account"
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-[#8a8a87] text-center leading-relaxed">
                  By creating an account you agree to our{" "}
                  <a href="/terms" className="text-[#1a4d2e] hover:underline">Terms of Service</a>
                  {" "}and{" "}
                  <a href="/privacy" className="text-[#1a4d2e] hover:underline">Privacy Policy</a>.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
