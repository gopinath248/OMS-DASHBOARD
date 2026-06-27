import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Kanban, Users, BarChart3, Shield } from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
  { icon: Kanban,    label: "Sprint Planning",    desc: "Jira-style boards & backlogs" },
  { icon: Users,     label: "Intern Management",  desc: "Full lifecycle from onboarding to evaluation" },
  { icon: BarChart3, label: "Analytics & Reports",desc: "Real-time dashboards and KPIs" },
  { icon: Shield,    label: "Enterprise Security", desc: "Role-based access and audit trails" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    localStorage.setItem("role", "admin");
    setTimeout(() => setLocation("/admin"), 600);
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">

      {/* ── Left brand panel ─────────────────────── */}
      <div className="hidden md:flex flex-col w-1/2 bg-gradient-to-br from-primary to-secondary p-12 text-primary-foreground relative overflow-hidden justify-between">
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

        <div className="z-10 relative">
          <div className="flex flex-col items-center gap-2 mb-10">
            <img
              src="/company-logo.png"
              alt="Corecode Global Logo"
              className="h-16 object-contain shrink-0"
              style={{ borderRadius: 0 }}
            />
            <div className="text-center">
              <p className="text-white text-base font-extrabold leading-tight tracking-wide uppercase">Corecode Global</p>
              <p className="text-white font-extrabold text-xl tracking-widest uppercase" style={{ color: "#D4AF37" }}>PLANWAY</p>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5 mt-4">
              Enterprise Intern<br />Management Suite
            </h1>
            <p className="text-primary-foreground/75 text-base max-w-md leading-relaxed">
              Manage your entire internship lifecycle — sprint planning, onboarding, tasks, and evaluations — in one powerful workspace.
            </p>
          </motion.div>
        </div>

        <div className="z-10 relative mt-8 space-y-3">
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
            Version 2.0 · © 2026 Corecode Global Hi-Tech Solutions
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
            <img src="/company-logo.png" alt="Corecode Logo" className="h-10 object-contain" />
            <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">PLANWAY</p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-8 shadow-xl">
            <div className="mb-7">
              <div className="flex flex-col items-center gap-1 mb-4">
                <h2 className="text-2xl font-bold tracking-tight text-center">Planway</h2>
                <p className="text-xs text-muted-foreground text-center">Corecode Global · Admin Portal</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="username">User ID</Label>
                <Input
                  id="username"
                  placeholder="AarthiCC001"
                  required
                  className="h-11"
                  defaultValue="AarthiCC001"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" className="text-xs text-primary hover:underline font-medium">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="h-11 pr-10"
                    defaultValue="password"
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

              <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-border/40">
              <p className="text-[11px] text-center text-muted-foreground">
                Protected by enterprise SSO · Corecode Global Security Policy
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
