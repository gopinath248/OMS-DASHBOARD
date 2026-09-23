import { useEffect, useState } from "react";
import { getAuthSession, roleToDashboardPath, validateAuthSession, type AuthRole, type AuthSession } from "@/lib/auth";

interface ProtectedRouteProps {
  allowedRoles: AuthRole[];
  children: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const [session, setSession] = useState<AuthSession | null>(() => getAuthSession());
  const [checking, setChecking] = useState(() => !getAuthSession());
  const isAllowed = !!session && allowedRoles.includes(session.user.role);

  const replaceLocation = (path: string) => {
    window.location.replace(path);
  };

  useEffect(() => {
    let cancelled = false;

    const validateSession = async () => {
      const storedSession = getAuthSession();
      setSession(storedSession);

      if (!storedSession) {
        setChecking(false);
        replaceLocation("/login");
        return;
      }

      if (!allowedRoles.includes(storedSession.user.role)) {
        setChecking(false);
        replaceLocation(roleToDashboardPath(storedSession.user.role));
        return;
      }

      setChecking(false);
      const currentSession = await validateAuthSession();
      if (cancelled) return;

      if (!currentSession) {
        setSession(null);
        replaceLocation("/login");
        return;
      }

      if (!allowedRoles.includes(currentSession.user.role)) {
        setSession(currentSession);
        replaceLocation(roleToDashboardPath(currentSession.user.role));
        return;
      }

      setSession(currentSession);
    };

    validateSession();
    const intervalId = window.setInterval(validateSession, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [allowedRoles]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Checking authentication...
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Redirecting...
      </div>
    );
  }

  return <>{children}</>;
}
