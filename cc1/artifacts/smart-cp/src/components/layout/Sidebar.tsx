import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, GraduationCap, Users, CalendarDays, ClipboardCheck,
  TrendingUp, BarChart3, Bell, Calendar, Settings, HelpCircle, LogOut,
  ChevronLeft, ChevronRight, FolderOpen, ChevronDown,
  IndianRupee, Briefcase, Layers, Kanban, MessageSquare,
  Activity, LayoutTemplate,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { clearAuthSession, type NavigationRole } from "@/lib/auth";

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  role: NavigationRole;
  chatUnreadCount?: number;
}

const RESOURCE_LINKS = [
  { href: "/students",      label: "Interns",          icon: GraduationCap },
  { href: "/staff",         label: "Employees",        icon: Users },
  { href: "/performance",   label: "Performance",      icon: TrendingUp },
  { href: "/reports",       label: "Reports",          icon: BarChart3 },
  { href: "/leave",         label: "Leave",            icon: CalendarDays },
  { href: "/salary",        label: "Salary",           icon: IndianRupee },
  { href: "/calendar",      label: "Calendar",         icon: Calendar },
  { href: "/notifications", label: "Notifications",    icon: Bell },
  { href: "/settings",      label: "Settings",         icon: Settings },
  { href: "/commands",      label: "Chat Center",      icon: MessageSquare },
];

const PLANYWAY_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard",       icon: LayoutDashboard },
  { href: "/planway/active",    label: "Sprint Management", icon: Kanban },
  { href: "/tasks",                label: "Task Board",        icon: LayoutTemplate },
  { href: "/reports",  label: "Analytics",       icon: Activity },
];

const STAFF_LINKS = [
  { href: "/employee/dashboard", label: "Dashboard",      icon: LayoutDashboard },
  { href: "/students",        label: "My Interns",    icon: GraduationCap },
  { href: "/projects",        label: "Projects",       icon: FolderOpen },
  { href: "/tasks",           label: "Tasks",          icon: ClipboardCheck },
  { href: "/leave",           label: "Leave",          icon: CalendarDays },
  { href: "/calendar",        label: "Calendar",       icon: Calendar },
  { href: "/notifications",   label: "Notifications",  icon: Bell },
  { href: "/commands",        label: "Chat Center",    icon: MessageSquare },
  { href: "/settings",        label: "Settings",       icon: Settings },
  { href: "/help",            label: "Help Center",    icon: HelpCircle },
];

const STUDENT_LINKS = [
  { href: "/intern/dashboard", label: "Dashboard",      icon: LayoutDashboard },
  { href: "/projects",          label: "My Projects",    icon: FolderOpen },
  { href: "/tasks",             label: "My Tasks",       icon: ClipboardCheck },
  { href: "/apply-leave",       label: "Apply Leave",    icon: CalendarDays },
  { href: "/calendar",          label: "Calendar",       icon: Calendar },
  { href: "/notifications",     label: "Notifications",  icon: Bell },
  { href: "/commands",          label: "Chat Center",    icon: MessageSquare },
  { href: "/settings",          label: "Settings",       icon: Settings },
  { href: "/help",              label: "Help Center",    icon: HelpCircle },
];

const STORAGE_RESOURCE = "sidebar-resource-open";
const STORAGE_PLANYWAY = "sidebar-planyway-open";

function NavLink({ href, label, icon: Icon, active, collapsed, badgeCount = 0 }: {
  href: string; label: string; icon: React.ElementType; active: boolean; collapsed: boolean; badgeCount?: number;
}) {
  const displayBadge = badgeCount > 0;
  const el = (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 rounded-md transition-all duration-150 text-sm font-medium",
        collapsed ? "justify-center p-2.5" : "px-3 py-2",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-secondary-foreground/75 hover:text-secondary-foreground hover:bg-secondary-foreground/10"
      )}
    >
      <Icon size={17} className="shrink-0" />
      {!collapsed && <span className="truncate text-[13px]">{label}</span>}
      {displayBadge && (
        <span
          className={cn(
            "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white",
            collapsed && "absolute right-0 top-0 h-4 min-w-4 translate-x-0.5 -translate-y-0.5 px-1 text-[9px]"
          )}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </Link>
  );
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{el}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium text-xs">{label}</TooltipContent>
      </Tooltip>
    );
  }
  return el;
}

function AccordionGroup({
  label, icon: Icon, open, onToggle, collapsed, children, gold,
}: {
  label: string; icon: React.ElementType; open: boolean;
  onToggle: () => void; collapsed: boolean; children: React.ReactNode; gold?: boolean;
}) {
  const trigger = (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2 rounded-md transition-colors",
        "hover:bg-secondary-foreground/10",
        gold
          ? "text-[#D4AF37]/80 hover:text-[#D4AF37]"
          : "text-secondary-foreground/50 hover:text-secondary-foreground/80",
        collapsed ? "justify-center p-2.5" : "px-2.5 py-2 justify-between"
      )}
      aria-expanded={open}
    >
      <div className="flex items-center gap-2">
        <Icon size={13} className="shrink-0" />
        {!collapsed && (
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={gold ? { color: "#D4AF37" } : undefined}
          >
            {label}
          </span>
        )}
      </div>
      {!collapsed && (
        <motion.div
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.2 }}
          className={cn("rounded-full p-0.5", open && "bg-secondary-foreground/10")}
        >
          <ChevronDown size={13} />
        </motion.div>
      )}
    </button>
  );

  return (
    <div>
      {collapsed
        ? (
          <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent side="right" className="font-medium text-xs">{label}</TooltipContent>
          </Tooltip>
        )
        : trigger
      }
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key={label}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className={cn("space-y-0.5 pt-0.5", !collapsed && "pl-1")}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar({ collapsed, setCollapsed, role, chatUnreadCount = 0 }: SidebarProps) {
  const [location] = useLocation();

  const [resourceOpen, setResourceOpen] = useState<boolean>(() => {
    const s = localStorage.getItem(STORAGE_RESOURCE);
    return s !== null ? s === "true" : true;
  });
  const [planwayOpen, setPlanwayOpen] = useState<boolean>(() => {
    const s = localStorage.getItem(STORAGE_PLANYWAY);
    return s !== null ? s === "true" : true;
  });

  const toggleResource = () => {
    const next = !resourceOpen;
    setResourceOpen(next);
    localStorage.setItem(STORAGE_RESOURCE, String(next));
  };
  const togglePlanyway = () => {
    const next = !planwayOpen;
    setPlanwayOpen(next);
    localStorage.setItem(STORAGE_PLANYWAY, String(next));
  };

  // when collapsed, force groups open so icons are always visible
  const effectiveResourceOpen = collapsed ? true : resourceOpen;
  const effectivePlanwayOpen  = collapsed ? true : planwayOpen;

  const currentPath = location.split("?")[0];
  const currentTab = currentPath.startsWith("/planway/")
    ? currentPath.split("/")[2]
    : new URLSearchParams(window.location.search).get("tab") ?? "active";
  const isActive = (href: string) => {
    const [path, query = ""] = href.split("?");
    if (path === currentPath) return true;
    if (currentPath === "/planway" && path === "/planway/active") return true;
    if (path !== "/planway" || !currentPath.startsWith("/planway")) return false;

    const tab = new URLSearchParams(query).get("tab");
    return tab ? currentTab === tab : true;
  };

  const roleLabel =
    role === "intern" ? "Intern" :
    role === "employee" ? "Employee" :
    role === "hr" ? "HR" :
    role === "manager" ? "manager" :
    "Admin";

  const navBadge = (href: string) => href === "/commands" ? chatUnreadCount : 0;

  const handleLogout = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    clearAuthSession();
    window.location.replace("/login");
  };

  return (
    <aside
      className={cn(
        "bg-secondary text-secondary-foreground flex flex-col transition-all duration-300 relative z-20 h-screen overflow-hidden shrink-0",
        collapsed ? "w-[64px]" : "w-60"
      )}
    >
      {/* ── Logo ──────────────────────────────────── */}
      <div className={cn(
        "flex items-center border-b border-secondary-foreground/10 shrink-0 overflow-hidden relative",
        collapsed ? "h-16 justify-center px-2" : "h-[84px] px-3 gap-2"
      )}>
        <img
          src="/company-logo.png"
          alt="CODE CORE"
          className={cn(
            "object-contain shrink-0 transition-all duration-300",
            collapsed ? "h-10 w-auto" : "h-14 w-auto"
          )}
        />
        {!collapsed && (
          <div className="min-w-0 flex-1 leading-none">
            <p className="text-[11px] font-bold text-white leading-tight tracking-[0.08em] uppercase">CODE CORE</p>
            <p className="text-[10px] font-bold leading-tight mt-1 tracking-[0.18em] uppercase" style={{ color: "#D4AF37" }}>PLANYWAY</p>
          </div>
        )}
        <Button
          variant="ghost" size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "text-secondary-foreground/60 hover:text-secondary-foreground hover:bg-secondary-foreground/10 h-7 w-7 shrink-0",
            collapsed && "absolute right-0.5 top-1/2 -translate-y-1/2"
          )}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </Button>
      </div>

      {/* ── Nav ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-3 scrollbar-none overflow-x-hidden">
        <nav className={cn("space-y-0.5", collapsed ? "px-1.5" : "px-2")}>

          {/* ADMIN */}
          {role === "admin" && (
            <>
              <AccordionGroup
                label="Resource Management"
                icon={Briefcase}
                open={effectiveResourceOpen}
                onToggle={toggleResource}
                collapsed={collapsed}
                gold
              >
                {RESOURCE_LINKS.map(l => (
                  <NavLink key={l.label} {...l} active={isActive(l.href)} collapsed={collapsed} badgeCount={navBadge(l.href)} />
                ))}
              </AccordionGroup>

              <div className={cn("border-t border-secondary-foreground/10 my-2", collapsed && "mx-2")} />

              <AccordionGroup
                label="PLANYWAY"
                icon={Layers}
                open={effectivePlanwayOpen}
                onToggle={togglePlanyway}
                collapsed={collapsed}
                gold
              >
                {PLANYWAY_LINKS.map(l => (
                  <NavLink key={l.label} {...l} active={isActive(l.href)} collapsed={collapsed} badgeCount={navBadge(l.href)} />
                ))}
              </AccordionGroup>
            </>
          )}

          {/* STAFF / EMPLOYEE / HR / manager */}
          {(["employee", "hr", "manager"] as NavigationRole[]).includes(role) && STAFF_LINKS.map(l => {
            const href =
              l.href === "/employee/dashboard" && role === "hr" ? "/hr/dashboard" :
              l.href === "/employee/dashboard" && role === "manager" ? "/manager/dashboard" :
              l.href;
            return <NavLink key={l.label} {...l} href={href} active={isActive(href)} collapsed={collapsed} badgeCount={navBadge(href)} />;
          })}

          {/* Intern */}
          {role === "intern" && STUDENT_LINKS.map(l => (
            <NavLink key={l.label} {...l} active={isActive(l.href)} collapsed={collapsed} badgeCount={navBadge(l.href)} />
          ))}
        </nav>
      </div>

      {/* ── Footer ────────────────────────────────── */}
      <div className={cn("border-t border-secondary-foreground/10 shrink-0 py-3", collapsed ? "px-1.5" : "px-3")}>
        {!collapsed && (
          <div className="mb-2 px-1">
            <div className="text-[9px] font-bold text-secondary-foreground/35 uppercase tracking-widest mb-1">Signed in as</div>
            <div className="bg-secondary-foreground/10 px-3 py-1.5 rounded text-xs font-semibold capitalize">
              {roleLabel}
            </div>
          </div>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/login"
              onClick={handleLogout}
              className={cn(
                "flex items-center gap-3 rounded-md text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors",
                collapsed ? "justify-center p-2.5" : "px-3 py-2.5"
              )}
            >
              <LogOut size={16} />
              {!collapsed && <span className="font-medium text-sm">Logout</span>}
            </Link>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right" className="text-xs">Logout</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  );
}
