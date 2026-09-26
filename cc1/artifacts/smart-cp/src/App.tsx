import { Switch, Route, Router as WouterRouter } from "wouter";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MessageSquare, X } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import NotFound from "@/pages/not-found";

import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AUTH_SESSION_CHANGED_EVENT, getAuthSession, type AuthRole } from "@/lib/auth";
import { clearAppData, replaceAppData } from "@/data/mockData";
import { recordChatPresence } from "@/lib/chatPresence";
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/AdminDashboard";
import StudentManagement from "@/pages/StudentManagement";
import StudentProfile from "@/pages/StudentProfile";
import StaffManagement from "@/pages/StaffManagement";
import StaffProfile from "@/pages/StaffProfile";
import LeaveManagement from "@/pages/LeaveManagement";
import TaskManagement from "@/pages/TaskManagement";
import PerformanceManagement from "@/pages/PerformanceManagement";
import Reports from "@/pages/Reports";
import StaffDashboard from "@/pages/StaffDashboard";
import StudentDashboard from "@/pages/StudentDashboard";
import Calendar from "@/pages/Calendar";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import HelpCenter from "@/pages/HelpCenter";
import ApplyLeave from "@/pages/ApplyLeave";
import Projects from "@/pages/Projects";
import ProjectDetail from "@/pages/ProjectDetail";
import PlanWay from "@/pages/PlanWay";
import SalaryManagement from "@/pages/SalaryManagement";
import Commands from "@/pages/Commands";
import CredentialManagement from "@/pages/CredentialManagement";
import ShiftManagement from "@/pages/ShiftManagement";

const queryClient = new QueryClient();
const ADMIN_ONLY: AuthRole[] = ["ADMIN"];
const EMPLOYEE_ONLY: AuthRole[] = ["EMPLOYEE"];
const INTERN_ONLY: AuthRole[] = ["INTERN"];
const HR_ONLY: AuthRole[] = ["HR"];
const MANAGER_ONLY: AuthRole[] = ["MANAGER"];
const ADMIN_HR_MANAGER: AuthRole[] = ["ADMIN", "HR", "MANAGER"];
const ADMIN_EMPLOYEE_HR_MANAGER: AuthRole[] = ["ADMIN", "EMPLOYEE", "HR", "MANAGER"];
const ALL_ROLES: AuthRole[] = ["ADMIN", "EMPLOYEE", "INTERN", "HR", "MANAGER"];

interface AppDataState {
  ready: boolean;
  error: string | null;
}

interface ChatMessageEvent {
  id: string;
  conversationId?: string;
  senderId?: string | null;
  user: string;
  message: string;
}

interface ChatPopup {
  id: string;
  conversationId: string;
  senderName: string;
  body: string;
}

function DashboardDataState({ error }: { error: string | null }) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="rounded-lg border bg-card px-6 py-5 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">
          {error ? "Unable to load dashboard data" : "Loading dashboard data..."}
        </p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {error ?? "Fetching your role-specific records from smart_cp."}
        </p>
      </div>
    </div>
  );
}

function GuardedPage({
  roles,
  appDataState,
  chatUnreadCount,
  fullWidth = false,
  children,
}: {
  roles: AuthRole[];
  appDataState: AppDataState;
  chatUnreadCount: number;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={roles}>
      <AppLayout chatUnreadCount={chatUnreadCount} fullWidth={fullWidth}>
        {appDataState.ready
          ? children
          : <DashboardDataState error={appDataState.error} />}
      </AppLayout>
    </ProtectedRoute>
  );
}

function Router({ appDataState, chatUnreadCount }: { appDataState: AppDataState; chatUnreadCount: number }) {
  const guarded = (roles: AuthRole[], children: ReactNode, fullWidth = false) => (
    <GuardedPage roles={roles} appDataState={appDataState} chatUnreadCount={chatUnreadCount} fullWidth={fullWidth}>
      {children}
    </GuardedPage>
  );

  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />

      <Route path="/admin/dashboard">{guarded(ADMIN_ONLY, <AdminDashboard />)}</Route>
      <Route path="/admin">{guarded(ADMIN_ONLY, <AdminDashboard />)}</Route>
      <Route path="/employee/dashboard">{guarded(EMPLOYEE_ONLY, <StaffDashboard />)}</Route>
      <Route path="/hr/dashboard">{guarded(HR_ONLY, <StaffDashboard />)}</Route>
      <Route path="/manager/dashboard">{guarded(MANAGER_ONLY, <StaffDashboard />)}</Route>
      <Route path="/staff-dashboard">{guarded(EMPLOYEE_ONLY, <StaffDashboard />)}</Route>
      <Route path="/intern/dashboard">{guarded(INTERN_ONLY, <StudentDashboard />)}</Route>
      <Route path="/student-dashboard">{guarded(INTERN_ONLY, <StudentDashboard />)}</Route>

      <Route path="/students">{guarded(ADMIN_EMPLOYEE_HR_MANAGER, <StudentManagement />)}</Route>
      <Route path="/students/:id">{guarded(ADMIN_EMPLOYEE_HR_MANAGER, <StudentProfile />)}</Route>

      <Route path="/staff">{guarded(ADMIN_HR_MANAGER, <StaffManagement />)}</Route>
      <Route path="/staff/:id">{guarded(ADMIN_HR_MANAGER, <StaffProfile />)}</Route>
      <Route path="/credentials">{guarded(ADMIN_ONLY, <CredentialManagement />)}</Route>

      <Route path="/leave">{guarded(ADMIN_EMPLOYEE_HR_MANAGER, <LeaveManagement />)}</Route>
      <Route path="/tasks">{guarded(ALL_ROLES, <TaskManagement />)}</Route>
      <Route path="/performance">{guarded(ADMIN_ONLY, <PerformanceManagement />)}</Route>
      <Route path="/reports">{guarded(ADMIN_ONLY, <Reports />)}</Route>

      <Route path="/calendar">{guarded(ALL_ROLES, <Calendar />)}</Route>
      <Route path="/notifications">{guarded(ALL_ROLES, <Notifications />)}</Route>
      <Route path="/settings">{guarded(ALL_ROLES, <Settings />)}</Route>
      <Route path="/help">{guarded(ALL_ROLES, <HelpCenter />)}</Route>
      <Route path="/shifts">{guarded(ALL_ROLES, <ShiftManagement />)}</Route>
      <Route path="/apply-leave">{guarded(INTERN_ONLY, <ApplyLeave />)}</Route>
      <Route path="/projects">{guarded(ALL_ROLES, <Projects />)}</Route>
      <Route path="/projects/:id">{guarded(ALL_ROLES, <ProjectDetail />)}</Route>
      <Route path="/planway/:tab">{guarded(ADMIN_ONLY, <PlanWay />)}</Route>
      <Route path="/planway">{guarded(ADMIN_ONLY, <PlanWay />)}</Route>
      <Route path="/salary">{guarded(ADMIN_ONLY, <SalaryManagement />)}</Route>
      <Route path="/commands">{guarded(ALL_ROLES, <Commands unreadCount={chatUnreadCount} />, true)}</Route>

      <Route>{guarded(ALL_ROLES, <NotFound />)}</Route>
    </Switch>
  );
}

function App() {
  const [dataVersion, setDataVersion] = useState(0);
  const [sessionToken, setSessionToken] = useState(() => getAuthSession()?.token ?? null);
  const [authRevision, setAuthRevision] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatPopup, setChatPopup] = useState<ChatPopup | null>(null);
  const seenChatMessageIds = useRef<Set<string>>(new Set());
  const chatAudioContext = useRef<AudioContext | null>(null);
  const [appDataState, setAppDataState] = useState<AppDataState>(() => ({
    ready: false,
    error: null,
  }));

  useEffect(() => {
    const syncSession = () => {
      const session = getAuthSession();
      setSessionToken(session?.token ?? null);
      setAuthRevision((version) => version + 1);
    };

    syncSession();
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDatabaseData() {
      if (!sessionToken) {
        clearAppData();
        setAppDataState({ ready: false, error: null });
        setChatUnreadCount(0);
        setChatPopup(null);
        setDataVersion((version) => version + 1);
        return;
      }

      clearAppData();
      setAppDataState({ ready: false, error: null });
      setDataVersion((version) => version + 1);

      const response = await fetch("/api/app-data", {
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
      }).catch(() => null);

      if (cancelled) return;

      if (!response) {
        setAppDataState({ ready: false, error: "Unable to connect to the backend." });
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
        setAppDataState({
          ready: false,
          error: payload?.message ?? payload?.error ?? `Dashboard data request failed with status ${response.status}.`,
        });
        return;
      }

      replaceAppData(await response.json());
      setAppDataState({ ready: true, error: null });
      setDataVersion((version) => version + 1);
    }

    loadDatabaseData();

    return () => {
      cancelled = true;
    };
  }, [sessionToken, authRevision]);

  useEffect(() => {
    if (!sessionToken) {
      setChatUnreadCount(0);
      setChatPopup(null);
      return;
    }

    let refreshTimer: number | undefined;
    let popupTimer: number | undefined;

    const refreshChatUnread = async () => {
      const latestSession = getAuthSession();
      if (!latestSession) return;

      const response = await fetch("/api/chat/unread-summary", {
        headers: {
          Authorization: `Bearer ${latestSession.token}`,
        },
      }).catch(() => null);

      if (!response?.ok) return;

      const payload = await response.json().catch(() => null) as { totalUnread?: number } | null;
      setChatUnreadCount(Number(payload?.totalUnread ?? 0));
    };

    const playIncomingChatSound = () => {
      try {
        const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) return;

        const context = chatAudioContext.current ?? new AudioContextCtor();
        chatAudioContext.current = context;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + 0.12);
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.05, context.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.18);
      } catch {
        // Browser autoplay policies can block audio until the next user gesture.
      }
    };

    const refreshAppData = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(async () => {
        const latestSession = getAuthSession();
        if (!latestSession) return;

        const response = await fetch("/api/app-data", {
          headers: {
            Authorization: `Bearer ${latestSession.token}`,
          },
        }).catch(() => null);

        if (!response?.ok) return;

        replaceAppData(await response.json());
        setAppDataState({ ready: true, error: null });
        setDataVersion((version) => version + 1);
      }, 150);
    };

    const source = new EventSource(`/api/chat/events?token=${encodeURIComponent(sessionToken)}`);
    source.addEventListener("leave_request_created", refreshAppData);
    source.addEventListener("leave_request_approved", refreshAppData);
    source.addEventListener("leave_request_rejected", refreshAppData);
    source.addEventListener("notification_created", refreshAppData);
    source.addEventListener("notification_deleted", refreshAppData);
    source.addEventListener("task_created", refreshAppData);
    source.addEventListener("task_updated", refreshAppData);
    source.addEventListener("project_created", refreshAppData);
    source.addEventListener("project_assigned", refreshAppData);
    source.addEventListener("presence", (event) => {
      const presence = JSON.parse((event as MessageEvent).data) as { userId?: string; online?: boolean };
      if (!presence.userId) return;
      recordChatPresence({ userId: presence.userId, online: Boolean(presence.online) });
      window.dispatchEvent(new CustomEvent("chat:presence", { detail: presence }));
    });
    source.addEventListener("message", (event) => {
      const message = JSON.parse((event as MessageEvent).data) as ChatMessageEvent;
      window.dispatchEvent(new CustomEvent("chat:message", { detail: message }));

      if (!message.id || seenChatMessageIds.current.has(message.id)) return;
      seenChatMessageIds.current.add(message.id);

      const latestSession = getAuthSession();
      if (!latestSession || message.senderId === latestSession.user.userId || !message.conversationId) return;

      refreshChatUnread();
      playIncomingChatSound();
      setChatPopup({
        id: message.id,
        conversationId: message.conversationId,
        senderName: message.user,
        body: message.message,
      });
      window.clearTimeout(popupTimer);
      popupTimer = window.setTimeout(() => setChatPopup(null), 6500);
    });
    source.addEventListener("reaction", (event) => {
      const message = JSON.parse((event as MessageEvent).data) as ChatMessageEvent;
      window.dispatchEvent(new CustomEvent("chat:reaction", { detail: message }));
    });

    refreshChatUnread();
    window.addEventListener("chat:read", refreshChatUnread);

    return () => {
      window.clearTimeout(refreshTimer);
      window.clearTimeout(popupTimer);
      window.removeEventListener("chat:read", refreshChatUnread);
      source.close();
    };
  }, [sessionToken]);

  const openChatPopupConversation = () => {
    if (!chatPopup) return;
    setChatPopup(null);
    window.location.assign(`/commands?conversation=${encodeURIComponent(chatPopup.conversationId)}`);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="smart-cp-theme">
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router appDataState={appDataState} chatUnreadCount={chatUnreadCount} />
          </WouterRouter>
          {chatPopup && (
            <div className="fixed bottom-5 right-5 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-card shadow-2xl">
              <button
                type="button"
                className="flex w-full items-start gap-3 p-4 text-left hover:bg-muted/40"
                onClick={openChatPopupConversation}
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <MessageSquare size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{chatPopup.senderName}</span>
                  <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{chatPopup.body}</span>
                  <span className="mt-2 block text-xs font-medium text-primary">Open Chat Center</span>
                </span>
              </button>
              <button
                type="button"
                aria-label="Dismiss chat notification"
                className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setChatPopup(null)}
              >
                <X size={14} />
              </button>
            </div>
          )}
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
