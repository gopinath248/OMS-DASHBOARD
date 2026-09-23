import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AUTH_SESSION_CHANGED_EVENT, getAuthSession, roleToNavigationRole, type NavigationRole } from "@/lib/auth";

function getCurrentNavigationRole(): NavigationRole {
  const session = getAuthSession();
  return session ? roleToNavigationRole(session.user.role) : "admin";
}

export function AppLayout({
  children,
  chatUnreadCount = 0,
  fullWidth = false,
}: {
  children: React.ReactNode;
  chatUnreadCount?: number;
  fullWidth?: boolean;
}) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved !== null ? saved === "true" : false;
  });
  const [role, setRole] = useState<NavigationRole>(getCurrentNavigationRole);

  useEffect(() => {
    const updateRole = () => setRole(getCurrentNavigationRole());
    updateRole();
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, updateRole);
    window.addEventListener("storage", updateRole);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, updateRole);
      window.removeEventListener("storage", updateRole);
    };
  }, []);

  const handleSetCollapsed = (value: boolean) => {
    setCollapsed(value);
    localStorage.setItem("sidebar-collapsed", String(value));
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
      <Sidebar collapsed={collapsed} setCollapsed={handleSetCollapsed} role={role} chatUnreadCount={chatUnreadCount} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 w-full mx-auto">
          <div className={`${fullWidth ? "w-full" : "max-w-7xl mx-auto"} h-full animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
