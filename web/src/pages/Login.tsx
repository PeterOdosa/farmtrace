import { useState, FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { signIn } from "../services/api";
import { supabase } from "../lib/supabase";

// ─── Left panel — decorative map side ────────────────────────────────────────
function MapPanel() {
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

      {/* Polygon illustration */}
      <svg
        viewBox="0 0 400 360"
        className="w-full max-w-sm relative z-10"
        aria-label="Farm polygon illustration"
        role="img"
      >
        {/* Polygon fill */}
        <polygon
          points="200,60 320,120 300,260 160,290 80,200 120,100"
          fill="#2d7a4f"
          opacity="0.3"
        />
        {/* Polygon stroke */}
        <polygon
          points="200,60 320,120 300,260 160,290 80,200 120,100"
          fill="none"
          stroke="#c8a96e"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Vertex dots */}
        {[[200,60],[320,120],[300,260],[160,290],[80,200],[120,100]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="5" fill="#c8a96e" />
        ))}
        {/* Road line */}
        <path
          d="M 120 100 L 80 40"
          stroke="#9dc9ae"
          strokeWidth="2"
          strokeDasharray="6 4"
          strokeLinecap="round"
        />
        {/* Area label */}
        <rect x="150" y="158" width="100" height="44" rx="8" fill="#1a4d2e" opacity="0.95" />
        <text x="200" y="177" textAnchor="middle" fill="#c8a96e" fontSize="10" fontFamily="Inter, sans-serif">Total area</text>
        <text x="200" y="195" textAnchor="middle" fill="#f7f5f0" fontSize="13" fontWeight="600" fontFamily="Inter, sans-serif">12.4 ha</text>
        {/* Live dot */}
        <circle cx="210" cy="175" r="10" fill="#4ade80" opacity="0.15" />
        <circle cx="210" cy="175" r="4" fill="#4ade80" />
      </svg>

      {/* Quote */}
      <div className="relative z-10 mt-8 text-center max-w-xs">
        <p
          className="text-2xl font-bold text-white leading-snug mb-3"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          "Know every inch<br />of your land."
        </p>
        <p className="text-sm text-[#9dc9ae]">
          Map. Plan. Navigate. All in one place.
        </p>
      </div>
    </div>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      const redirect = searchParams.get("redirect") || "/dashboard";
      navigate(redirect);
    } catch (err: any) {
      setError(err.message || "Incorrect email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  return (
    <div className="min-h-screen flex font-sans">
      <MapPanel />

      {/* Right panel — form */}
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

          {/* Heading */}
          <h1
            className="text-3xl font-bold text-[#1c1c1a] mb-1"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Welcome back
          </h1>
          <p className="text-sm text-[#5a5a57] mb-8">
            Sign in to your farm dashboard
          </p>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
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
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-[#3a3a38]">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#1a4d2e] hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a4d2e] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#2d7a4f] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#e0e0dc]" />
            <span className="text-xs text-[#a0a09c]">or</span>
            <div className="flex-1 h-px bg-[#e0e0dc]" />
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogleLogin}
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

          {/* Sign up link */}
          <p className="text-center text-xs text-[#5a5a57] mt-8">
            Don't have an account?{" "}
            <Link to="/signup" className="text-[#1a4d2e] font-medium hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
