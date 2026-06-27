import { Link, useLocation } from "wouter";
import {
  FolderGit2,
  LayoutDashboard,
  FileText,
  Users,
  Search,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: FolderGit2 },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/search", label: "Search", icon: Search },
  ];

  if (user?.role === "admin") {
    navItems.push({ href: "/users", label: "Users", icon: Users });
  }

  return (
    <div className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="p-6">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-sidebar-primary">
          <div className="size-8 rounded bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
            D
          </div>
          DMS Portal
        </div>
      </div>

      <div className="flex-1 px-4 py-2 space-y-1">
        <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-4 px-2">
          Navigation
        </div>

        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer
                ${isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="size-4" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="size-8 rounded-full bg-sidebar-accent flex items-center justify-center font-bold text-xs uppercase text-sidebar-foreground">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{user?.name}</span>
            <span className="text-xs text-sidebar-foreground/50 truncate capitalize">{user?.role}</span>
          </div>
        </div>

        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          data-testid="button-logout"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
