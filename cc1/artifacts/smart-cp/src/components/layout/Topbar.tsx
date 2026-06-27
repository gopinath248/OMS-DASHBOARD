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
import { notifications as allNotifications } from "@/data/mockData";

const ICON_MAP: Record<string, React.ReactNode> = {
  System: <AlertTriangle size={14} className="text-blue-500" />,
  Leave: <CalendarDays size={14} className="text-orange-500" />,
  Performance: <TrendingUp size={14} className="text-green-500" />,
  Tasks: <ClipboardCheck size={14} className="text-purple-500" />,
  Announcements: <Megaphone size={14} className="text-pink-500" />,
};

const ROLE_INFO: Record<string, { name: string; email: string; initials: string }> = {
  admin: { name: "Admin User", email: "admin@codecore.edu", initials: "AU" },
  staff: { name: "Dr. Smith", email: "smith@codecore.edu", initials: "DS" },
  student: { name: "Alice Johnson", email: "alice.johnson@codecore.edu", initials: "AJ" },
};

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const [time, setTime] = useState(new Date());
  const [notifications, setNotifications] = useState(allNotifications);
  const [, navigate] = useLocation();
  const role = localStorage.getItem("role") ?? "admin";
  const userInfo = ROLE_INFO[role] ?? ROLE_INFO["admin"];

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const unread = notifications.filter(n => !n.read).length;
  const recent = notifications.slice(0, 5);

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <header className="h-16 border-b bg-card/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center w-full max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search across platform..."
            className="w-full pl-9 bg-muted/50 border-transparent focus-visible:bg-background"
          />
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
                <AvatarImage src="" alt={userInfo.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{userInfo.initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">{userInfo.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{userInfo.email}</p>
                <Badge variant="outline" className="w-fit mt-1.5 text-[10px] capitalize px-1.5 py-0.5 h-auto">{role}</Badge>
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
              onClick={() => { localStorage.removeItem("role"); navigate("/login"); }}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
