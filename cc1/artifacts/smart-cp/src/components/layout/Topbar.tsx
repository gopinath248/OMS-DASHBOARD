import { Search, Bell, Sun, Moon, AlertTriangle, CalendarDays, TrendingUp, Megaphone, ClipboardCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/lib/theme-provider";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  leaveRequests,
  notifications as allNotifications,
  projectDocuments,
  projects,
  staff,
  students,
  tasks,
} from "@/data/mockData";
import {
  AUTH_SESSION_CHANGED_EVENT,
  clearAuthSession,
  formatRole,
  getAuthSession,
  roleToNavigationRole,
  type AuthSession,
  type NavigationRole,
} from "@/lib/auth";
import { markAllNotificationsRead } from "@/lib/api";

const ICON_MAP: Record<string, React.ReactNode> = {
  System: <AlertTriangle size={14} className="text-blue-500" />,
  Leave: <CalendarDays size={14} className="text-orange-500" />,
  Performance: <TrendingUp size={14} className="text-green-500" />,
  Tasks: <ClipboardCheck size={14} className="text-purple-500" />,
  Announcements: <Megaphone size={14} className="text-pink-500" />,
};

const ROLE_INFO: Record<string, { name: string; email: string; initials: string; avatarUrl: string | null }> = {
  admin: { name: "Admin User", email: "admin@cc.local", initials: "AU", avatarUrl: null },
  employee: { name: "Dr. Smith", email: "smith@cc.local", initials: "DS", avatarUrl: null },
  intern: { name: "Intern User", email: "intern@cc.local", initials: "IU", avatarUrl: null },
  hr: { name: "HR User", email: "hr@cc.local", initials: "HU", avatarUrl: null },
  manager: { name: "manager User", email: "manager@cc.local", initials: "MU", avatarUrl: null },
};

type SearchTarget = {
  label: string;
  path: string;
  type: string;
  description?: string;
  keywords: string[];
  roles: NavigationRole[];
};

const ALL_NAV_ROLES: NavigationRole[] = ["admin", "employee", "intern", "hr", "manager"];
const ADMIN_ROLES: NavigationRole[] = ["admin"];
const ADMIN_EMPLOYEE_ROLES: NavigationRole[] = ["admin", "employee", "hr", "manager"];

const PAGE_SEARCH_TARGETS: SearchTarget[] = [
  { label: "Admin Dashboard", path: "/admin/dashboard", type: "Page", description: "Admin overview", keywords: ["dashboard", "admin", "overview", "home"], roles: ADMIN_ROLES },
  { label: "Employee Dashboard", path: "/employee/dashboard", type: "Page", description: "Employee overview", keywords: ["dashboard", "employee", "staff home"], roles: ["employee"] },
  { label: "HR Dashboard", path: "/hr/dashboard", type: "Page", description: "HR overview", keywords: ["dashboard", "hr", "people"], roles: ["hr"] },
  { label: "manager Dashboard", path: "/manager/dashboard", type: "Page", description: "manager overview", keywords: ["dashboard", "manager", "team"], roles: ["manager"] },
  { label: "Intern Dashboard", path: "/intern/dashboard", type: "Page", description: "Intern overview", keywords: ["dashboard", "intern", "student home"], roles: ["intern"] },
  { label: "Resource Management", path: "/students", type: "Page", description: "Intern records", keywords: ["resource", "intern", "student", "resources", "onboarding"], roles: ADMIN_EMPLOYEE_ROLES },
  { label: "Employee Management", path: "/staff", type: "Page", description: "Employee records", keywords: ["employee", "staff", "designation"], roles: ADMIN_ROLES },
  { label: "Performance Management", path: "/performance", type: "Page", description: "Performance scorecards", keywords: ["performance", "attendance", "score", "rating"], roles: ADMIN_ROLES },
  { label: "Reports & Analytics", path: "/reports", type: "Page", description: "Reports and exports", keywords: ["reports", "analytics", "csv", "pdf"], roles: ADMIN_ROLES },
  { label: "Leave Management", path: "/leave", type: "Page", description: "Leave requests", keywords: ["leave", "holiday", "absence", "approval"], roles: ADMIN_EMPLOYEE_ROLES },
  { label: "Apply Leave", path: "/apply-leave", type: "Page", description: "Intern leave request", keywords: ["apply leave", "request leave", "absence"], roles: ["intern"] },
  { label: "Salary Management", path: "/salary", type: "Page", description: "Payroll and payslips", keywords: ["salary", "payslip", "payroll", "inr", "rupee"], roles: ADMIN_ROLES },
  { label: "Calendar", path: "/calendar", type: "Page", description: "Events and meetings", keywords: ["calendar", "meeting", "schedule", "event"], roles: ALL_NAV_ROLES },
  { label: "Notifications", path: "/notifications", type: "Page", description: "Alerts and updates", keywords: ["notifications", "alerts", "status", "updates"], roles: ALL_NAV_ROLES },
  { label: "Settings", path: "/settings", type: "Page", description: "Profile and security", keywords: ["profile", "theme", "settings", "security", "password"], roles: ALL_NAV_ROLES },
  { label: "Help Center", path: "/help", type: "Page", description: "Support articles", keywords: ["help", "support", "faq"], roles: ALL_NAV_ROLES },
  { label: "Chat Center", path: "/commands", type: "Page", description: "Team messages", keywords: ["chat", "messages", "command", "conversation"], roles: ALL_NAV_ROLES },
  { label: "Projects", path: "/projects", type: "Page", description: "Project workspace", keywords: ["project", "documents", "assigned work"], roles: ALL_NAV_ROLES },
  { label: "Task Board", path: "/tasks", type: "Page", description: "Kanban tasks", keywords: ["task", "tasks", "ticket", "kanban", "todo", "done"], roles: ALL_NAV_ROLES },
  { label: "Sprint Management", path: "/planway/active", type: "Page", description: "PLANWAY active sprint", keywords: ["sprint", "jira", "active sprint", "planyway"], roles: ADMIN_ROLES },
  { label: "Credentials", path: "/credentials", type: "Page", description: "Access control", keywords: ["credentials", "user id", "password", "access"], roles: ADMIN_ROLES },
];

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}

function includesQuery(target: SearchTarget, query: string) {
  const haystack = [
    target.label,
    target.type,
    target.description ?? "",
    ...target.keywords,
  ].join(" ").toLowerCase();

  return query
    .split(/\s+/)
    .filter(Boolean)
    .every(part => haystack.includes(part));
}

function getSearchTargets(role: NavigationRole): SearchTarget[] {
  const studentTargets: SearchTarget[] = students.map(student => ({
    label: student.name,
    path: `/students/${student.id}`,
    type: "Intern",
    description: `${student.id} • ${student.project}`,
    keywords: [
      student.id,
      student.name,
      student.role,
      student.project,
      student.college,
      student.email,
      student.phone,
      student.manager,
      student.status,
      ...student.skills,
    ],
    roles: ADMIN_EMPLOYEE_ROLES,
  }));

  const staffTargets: SearchTarget[] = staff.map(employee => ({
    label: employee.name,
    path: `/staff/${employee.id}`,
    type: "Employee",
    description: `${employee.id} • ${employee.designation}`,
    keywords: [
      employee.id,
      employee.name,
      employee.role,
      employee.designation,
      employee.email,
      employee.phone,
      employee.status,
      employee.bio,
    ],
    roles: ADMIN_ROLES,
  }));

  const projectTargets: SearchTarget[] = projects.map(project => ({
    label: project.name,
    path: `/projects/${project.id}`,
    type: "Project",
    description: `${project.id} • ${project.status}`,
    keywords: [
      project.id,
      project.name,
      project.description,
      project.category,
      project.createdBy,
      project.status,
      project.priority ?? "",
      ...(project.techStack ?? []),
    ],
    roles: ALL_NAV_ROLES,
  }));

  const taskTargets: SearchTarget[] = tasks.map(task => ({
    label: task.title,
    path: "/tasks",
    type: "Task",
    description: `${task.id} • ${task.status} • ${task.assignedTo}`,
    keywords: [
      task.id,
      task.title,
      task.description,
      task.assignedTo,
      task.priority,
      task.status,
      task.dueDate,
    ],
    roles: ALL_NAV_ROLES,
  }));

  const leaveTargets: SearchTarget[] = leaveRequests.map(request => ({
    label: `${request.internName} ${request.type} Leave`,
    path: "/leave",
    type: "Leave",
    description: `${request.id} • ${request.status} • ${request.duration} day(s)`,
    keywords: [
      request.id,
      request.internName,
      request.type,
      request.reason,
      request.status,
      request.startDate,
      request.endDate,
    ],
    roles: ADMIN_EMPLOYEE_ROLES,
  }));

  const documentTargets: SearchTarget[] = projectDocuments.map(document => ({
    label: document.title,
    path: `/projects/${document.projectId}`,
    type: "Document",
    description: `${document.fileName} • ${document.uploadedBy}`,
    keywords: [
      document.id,
      document.projectId,
      document.title,
      document.fileName,
      document.fileType,
      document.uploadedBy,
      document.uploadDate,
    ],
    roles: ALL_NAV_ROLES,
  }));

  const notificationTargets: SearchTarget[] = allNotifications.map(notification => ({
    label: notification.title,
    path: "/notifications",
    type: "Notification",
    description: notification.message,
    keywords: [
      notification.id,
      notification.category,
      notification.title,
      notification.message,
      notification.time,
    ],
    roles: ALL_NAV_ROLES,
  }));

  return [
    ...PAGE_SEARCH_TARGETS,
    ...studentTargets,
    ...staffTargets,
    ...projectTargets,
    ...taskTargets,
    ...leaveTargets,
    ...documentTargets,
    ...notificationTargets,
  ].filter(target => target.roles.includes(role));
}

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const [time, setTime] = useState(new Date());
  const [notifications, setNotifications] = useState(allNotifications);
  const [search, setSearch] = useState("");
  const [session, setSession] = useState<AuthSession | null>(() => getAuthSession());
  const [, navigate] = useLocation();
  const role = session ? roleToNavigationRole(session.user.role) : "admin";
  const userInfo = session
    ? {
        name: session.user.fullName,
        email: session.user.email,
        initials: getInitials(session.user.fullName),
        avatarUrl: session.user.avatarUrl ?? null,
      }
    : ROLE_INFO[role] ?? ROLE_INFO["admin"];

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setNotifications([...allNotifications]);
  }, [allNotifications]);

  useEffect(() => {
    const refreshSession = () => setSession(getAuthSession());
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, refreshSession);
    window.addEventListener("storage", refreshSession);
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, refreshSession);
      window.removeEventListener("storage", refreshSession);
    };
  }, []);

  const unread = notifications.filter(n => !n.read).length;
  const recent = notifications.slice(0, 5);
  const availableSearchTargets = getSearchTargets(role);
  const searchResults = search.trim()
    ? availableSearchTargets
        .filter(target => includesQuery(target, search.trim().toLowerCase()))
        .slice(0, 8)
    : [];

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    markAllNotificationsRead().catch(error => console.error("Unable to persist notification read state.", error));
  };
  const runSearch = (path?: string) => {
    const targetPath = path ?? searchResults[0]?.path;
    if (!targetPath) return;
    setSearch("");
    navigate(targetPath);
  };

  return (
    <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center w-full max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search across platform..."
            className="w-full pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") runSearch();
              if (e.key === "Escape") setSearch("");
            }}
          />
          {search.trim() && (
            <div className="absolute left-0 right-0 top-10 z-40 rounded-md border bg-popover shadow-md overflow-hidden">
              {searchResults.length > 0 ? (
                searchResults.map(result => (
                  <button
                    key={`${result.type}-${result.path}-${result.label}`}
                    type="button"
                    className="block w-full px-3 py-2 text-left hover:bg-muted"
                    onMouseDown={e => {
                      e.preventDefault();
                      runSearch(result.path);
                    }}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{result.label}</span>
                        {result.description && (
                          <span className="block truncate text-xs text-muted-foreground">{result.description}</span>
                        )}
                      </span>
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {result.type}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-3 text-sm text-muted-foreground">
                  No matching page or record found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center text-sm font-medium text-muted-foreground">
          {time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          <span className="mx-2">•</span>
          {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full">
              <Bell className="h-[1.2rem] w-[1.2rem]" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align="end">
            <DropdownMenuLabel className="font-normal pb-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">Notifications</p>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <Badge className="text-[10px] px-1.5 py-0.5 h-auto bg-primary">{unread} new</Badge>
                  )}
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {recent.map(notif => (
              <DropdownMenuItem
                key={notif.id}
                className={`flex items-start gap-3 py-3 px-3 cursor-pointer ${!notif.read ? "bg-primary/5" : ""}`}
                onClick={() => navigate("/notifications")}
              >
                <div className="mt-0.5 shrink-0">
                  {ICON_MAP[notif.category] ?? <Bell size={14} className="text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-snug truncate ${!notif.read ? "font-semibold" : "font-medium"}`}>{notif.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{notif.message}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{notif.time}</p>
                </div>
                {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-sm font-medium text-primary text-center justify-center cursor-pointer py-2"
              onClick={() => navigate("/notifications")}
            >
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                {userInfo.avatarUrl && <AvatarImage src={userInfo.avatarUrl} alt={userInfo.name} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{userInfo.initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">{userInfo.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{userInfo.email}</p>
                <Badge variant="outline" className="w-fit mt-1.5 text-[10px] capitalize px-1.5 py-0.5 h-auto">
                  {session ? formatRole(session.user.role) : formatRole(role)}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/settings")}>
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/notifications")}>
              Notifications {unread > 0 && `(${unread})`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive"
              onClick={() => { clearAuthSession(); window.location.replace("/login"); }}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
