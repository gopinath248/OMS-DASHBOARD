import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { getAuthSession, loginWithCredentials, roleToDashboardPath } from "@/lib/auth";

const FEATURES: any[] = [];

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const replaceLocation = (path: string) => {
    window.location.replace(path);
  };

  useEffect(() => {
    const session = getAuthSession();
    if (session) {
      replaceLocation(roleToDashboardPath(session.user.role));
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const normalizedUserId = userId.trim().toUpperCase();
    if (!/^[A-Z0-9._-]+$/.test(normalizedUserId)) {
      setError("Enter a valid uppercase User ID.");
      return;
    }
    setLoading(true);
    try {
      const session = await loginWithCredentials(normalizedUserId, password);
      replaceLocation(roleToDashboardPath(session.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid User ID or Password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">

      {/* ── Left brand panel ─────────────────────── */}
      <div className="hidden md:flex flex-col w-1/2 bg-gradient-to-br from-primary to-secondary p-12 text-primary-foreground relative overflow-hidden justify-center">
        <div className="absolute inset-0 z-0 opacity-[0.07]">
          <svg className="w-full h-full" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>

        <div className="z-10 relative flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center gap-5"
          >
            <img
              src="/company-logo.png"
              alt="CODE CORE Logo"
              className="h-40 lg:h-52 object-contain shrink-0"
              style={{ borderRadius: 0 }}
            />
            <div className="text-center">
              <p className="text-white text-3xl lg:text-4xl font-extrabold leading-tight tracking-[0.08em] uppercase">CODE CORE</p>
              <p className="font-extrabold text-4xl lg:text-6xl tracking-[0.18em] uppercase mt-3" style={{ color: "#D4AF37" }}>PLANYWAY</p>
            </div>
          </motion.div>

          <motion.div className="hidden" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5 mt-4">
              CODE CORE<br />PLANYWAY
            </h1>
            <p className="text-primary-foreground/75 text-base max-w-md leading-relaxed">
              Manage your entire internship lifecycle — sprint planning, onboarding, tasks, and evaluations — in one powerful workspace.
            </p>
          </motion.div>
        </div>

        <div className="hidden">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                <f.icon size={17} />
              </div>
              <div>
                <p className="font-semibold text-sm">{f.label}</p>
                <p className="text-primary-foreground/60 text-xs">{f.desc}</p>
              </div>
            </motion.div>
          ))}
          <p className="text-primary-foreground/35 text-xs pt-5">
            Version 2.0 · © 2026 CODE CORE Hi-Tech Solutions
          </p>
        </div>
      </div>

      {/* ── Right login panel ────────────────────── */}
      <div className="flex flex-col w-full md:w-1/2 items-center justify-center p-6 sm:p-14 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-md"
        >
          <div className="md:hidden flex flex-col items-center gap-2 mb-8">
            <img src="/company-logo.png" alt="CODE CORE Logo" className="h-24 object-contain" />
            <p className="text-base font-extrabold tracking-[0.08em] uppercase">CODE CORE</p>
            <p className="text-xl font-extrabold tracking-[0.18em] uppercase" style={{ color: "#D4AF37" }}>PLANYWAY</p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-8 shadow-xl">
            <div className="mb-7">
              <div className="flex flex-col items-center gap-2 mb-4">
                <img src="/company-logo.png" alt="CODE CORE Logo" className="hidden md:block h-20 object-contain" />
                <p className="hidden md:block text-base font-extrabold tracking-[0.08em] uppercase text-center">CODE CORE</p>
                <h2 className="text-2xl font-extrabold tracking-[0.18em] text-center" style={{ color: "#D4AF37" }}>PLANYWAY</h2>
                <p className="hidden">CODE CORE · Unified Portal</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="username">User ID</Label>
                <Input
                  id="username"
                  placeholder=""
                  required
                  className="h-11"
                  value={userId}
                  onChange={e => setUserId(e.target.value.trimStart().toUpperCase())}
                  onBlur={() => setUserId(value => value.trim().toUpperCase())}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="h-11 pr-10"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(p => !p)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm font-medium text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                {loading ? "Signing in..." : "Login"}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-border/40">
              <p className="text-[11px] text-center text-muted-foreground">
                Protected by enterprise SSO · CODE CORE Security Policy
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
