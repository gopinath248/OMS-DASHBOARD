import { useState } from "react";
import { Bell, Check, Clock, Search, Trash2, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { notifications as initialNotifications } from "@/data/mockData";

type Notification = typeof initialNotifications[0];
type FilterTab = "All" | "Unread" | "Approved" | "Pending" | "Rejected";

const FILTER_TABS: FilterTab[] = ["All", "Unread", "Approved", "Pending", "Rejected"];

const STATUS_COLORS: Record<string, string> = {
  Approved: "bg-green-100 text-green-700 border-green-200",
  Pending:  "bg-yellow-100 text-yellow-700 border-yellow-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
};

function getNotifStatus(notif: Notification): string {
  const msg = (notif.message + " " + notif.title).toLowerCase();
  if (msg.includes("approv") || msg.includes("approved")) return "Approved";
  if (msg.includes("reject") || msg.includes("rejected")) return "Rejected";
  if (msg.includes("pending") || msg.includes("assigned") || msg.includes("submitted")) return "Pending";
  return "Pending";
}

function getTimeAgo(time: string): string {
  return time;
}

function NotificationItem({ notif, onRead, onDelete }: {
  notif: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const status = getNotifStatus(notif);

  return (
    <div
      className={`group flex items-start gap-4 px-5 py-4 border-b last:border-b-0 transition-colors hover:bg-muted/30 cursor-pointer ${!notif.read ? "bg-primary/5" : "bg-background"}`}
      onClick={() => onRead(notif.id)}
    >
      {/* Unread dot */}
      <div className="mt-1.5 shrink-0">
        {!notif.read
          ? <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          : <div className="w-2.5 h-2.5 rounded-full bg-transparent" />
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className={`text-sm leading-snug truncate ${!notif.read ? "font-semibold" : "font-medium text-muted-foreground"}`}>
              {notif.title}
            </h4>
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{notif.message}</p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-2">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 whitespace-nowrap">
              <Clock size={10} /> {getTimeAgo(notif.time)}
            </span>
            <Badge variant="outline" className={`text-[10px] h-5 px-2 font-semibold ${STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"}`}>
              {status}
            </Badge>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-normal h-5 px-2">{notif.category}</Badge>
        </div>
      </div>

      {/* Delete button */}
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive mt-0.5 shrink-0"
        onClick={e => { e.stopPropagation(); onDelete(notif.id); }}
      >
        <X size={15} />
      </button>
    </div>
  );
}

export default function Notifications() {
  const [notifs, setNotifs] = useState(initialNotifications);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");
  const [search, setSearch] = useState("");

  const markRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const deleteNotif = (id: string) => setNotifs(prev => prev.filter(n => n.id !== id));

  const unreadCount = notifs.filter(n => !n.read).length;

  const filtered = notifs.filter(n => {
    const matchesSearch = search === "" || 
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.message.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === "All") return true;
    if (activeFilter === "Unread") return !n.read;
    return getNotifStatus(n) === activeFilter;
  });

  const getTabCount = (tab: FilterTab): number => {
    if (tab === "All") return notifs.filter(n => !n.read).length;
    if (tab === "Unread") return notifs.filter(n => !n.read).length;
    return notifs.filter(n => getNotifStatus(n) === tab && !n.read).length;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <Badge className="bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-xs font-bold">
              {unreadCount}
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={markAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck size={15} /> Mark all read
        </Button>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        {/* Search + Filters */}
        <div className="border-b px-5 pt-4 pb-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications…"
              className="pl-9 h-9 text-sm bg-muted/30 border-0 focus-visible:ring-1"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-0 overflow-x-auto">
            {FILTER_TABS.map(tab => {
              const count = getTabCount(tab);
              const isActive = activeFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                  {count > 0 && (
                    <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center ${
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notification list */}
        <div className="divide-y">
          {filtered.length > 0 ? (
            filtered.map(notif => (
              <NotificationItem
                key={notif.id}
                notif={notif}
                onRead={markRead}
                onDelete={deleteNotif}
              />
            ))
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <Bell className="mx-auto h-10 w-10 opacity-20 mb-4" />
              <p className="font-medium">No notifications here.</p>
              <p className="text-sm mt-1">
                {search ? "Try a different search term." : `You have no ${activeFilter.toLowerCase()} notifications.`}
              </p>
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t bg-muted/20 text-xs text-muted-foreground flex justify-between">
            <span>Showing {filtered.length} of {notifs.length} notifications</span>
            <span>{unreadCount} unread</span>
          </div>
        )}
      </div>
    </div>
  );
}
