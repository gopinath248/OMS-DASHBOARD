import { useEffect, useRef, useState } from "react";
import { Bell, Check, Clock, Search, Trash2, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { notifications as initialNotifications } from "@/data/mockData";
import {
  deleteBoardMoveNotification,
  getBoardMoveNotifications,
  markAllBoardMoveNotificationsRead,
  markBoardMoveNotificationRead,
  updateBoardMoveComment,
  type BoardMoveNotification,
} from "@/lib/boardAudit";
import { APP_DATA_UPDATED_EVENT, deleteNotification, markAllNotificationsRead, markNotificationRead } from "@/lib/api";

type BaseNotification = typeof initialNotifications[0];
type Notification = BaseNotification | BoardMoveNotification;
type FilterTab = "All" | "Unread" | "Approved" | "Pending" | "Rejected";
type PendingDelete = {
  notification: Notification;
  expiresAt: number;
};

const FILTER_TABS: FilterTab[] = ["All", "Unread", "Approved", "Pending", "Rejected"];

const STATUS_COLORS: Record<string, string> = {
  Approved: "bg-green-100 text-green-700 border-green-200",
  Pending:  "bg-yellow-100 text-yellow-700 border-yellow-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
};

function getNotifStatus(notif: Notification): string {
  if (isBoardMoveNotification(notif)) return "Pending";

  const msg = (notif.message + " " + notif.title).toLowerCase();
  if (msg.includes("approv") || msg.includes("approved")) return "Approved";
  if (msg.includes("reject") || msg.includes("rejected")) return "Rejected";
  if (msg.includes("pending") || msg.includes("assigned") || msg.includes("submitted")) return "Pending";
  return "Pending";
}

function getTimeAgo(time: string): string {
  return time;
}

function isBoardMoveNotification(notif: Notification): notif is BoardMoveNotification {
  return "movement" in notif;
}

function getTaskNotificationId(notif: Notification) {
  if (isBoardMoveNotification(notif)) return "";
  if (notif.taskId) return notif.taskId;
  return notif.message.match(/\bTask ID\s+(\d+)\b/i)?.[1] ?? "";
}

function NotificationItem({ notif, onRead, onDelete, onStatusUpdate, onOpenMoveDetails, onOpenTask }: {
  notif: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusUpdate: (id: string, status: "Approved" | "Rejected") => void;
  onOpenMoveDetails: (notif: BoardMoveNotification) => void;
  onOpenTask: (taskId: string) => void;
}) {
  const status = getNotifStatus(notif);
  const taskId = getTaskNotificationId(notif);

  return (
    <div
      className={`group flex items-start gap-4 px-5 py-4 border-b last:border-b-0 transition-colors hover:bg-muted/30 cursor-pointer ${!notif.read ? "bg-primary/5" : "bg-background"}`}
      onClick={() => {
        onRead(notif.id);
        if (isBoardMoveNotification(notif)) onOpenMoveDetails(notif);
        else if (taskId) onOpenTask(taskId);
      }}
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
          {status === "Pending" && !isBoardMoveNotification(notif) && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px]"
                onClick={e => { e.stopPropagation(); onStatusUpdate(notif.id, "Approved"); }}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px]"
                onClick={e => { e.stopPropagation(); onStatusUpdate(notif.id, "Rejected"); }}
              >
                Reject
              </Button>
            </>
          )}
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
  const [, navigate] = useLocation();
  const [notifs, setNotifs] = useState<Notification[]>(() => [
    ...getBoardMoveNotifications(),
    ...initialNotifications,
  ]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("All");
  const [search, setSearch] = useState("");
  const [selectedMove, setSelectedMove] = useState<BoardMoveNotification | null>(null);
  const [moveComment, setMoveComment] = useState("");
  const [pendingDeletes, setPendingDeletes] = useState<PendingDelete[]>([]);
  const pendingDeleteIds = useRef<Set<string>>(new Set());
  const deleteTimers = useRef<Map<string, number>>(new Map());
  const mounted = useRef(true);

  const syncNotifications = () => {
    const hiddenIds = pendingDeleteIds.current;
    setNotifs([
      ...getBoardMoveNotifications(),
      ...initialNotifications,
    ].filter(notification => !hiddenIds.has(notification.id)));
  };

  useEffect(() => {
    mounted.current = true;
    syncNotifications();
    window.addEventListener("planyway-board-notifications-updated", syncNotifications);
    window.addEventListener(APP_DATA_UPDATED_EVENT, syncNotifications);
    return () => {
      mounted.current = false;
      window.removeEventListener("planyway-board-notifications-updated", syncNotifications);
      window.removeEventListener(APP_DATA_UPDATED_EVENT, syncNotifications);
    };
  }, []);

  useEffect(() => {
    setMoveComment(selectedMove?.movement.comment ?? "");
  }, [selectedMove]);

  const markRead = (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const notification = notifs.find(n => n.id === id);
    if (notification && isBoardMoveNotification(notification)) {
      markBoardMoveNotificationRead(id);
    } else if (notification) {
      markNotificationRead(id).catch(error => console.error("Unable to persist notification read state.", error));
    }
  };
  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    markAllBoardMoveNotificationsRead();
    markAllNotificationsRead().catch(error => console.error("Unable to persist notification read state.", error));
  };
  const finalizeDelete = (notification: Notification) => {
    deleteTimers.current.delete(notification.id);
    pendingDeleteIds.current.delete(notification.id);
    if (mounted.current) {
      setPendingDeletes(prev => prev.filter(item => item.notification.id !== notification.id));
    }

    const remove = isBoardMoveNotification(notification)
      ? Promise.resolve(deleteBoardMoveNotification(notification.id))
      : deleteNotification(notification.id);

    remove.catch(error => {
      console.error("Unable to delete notification.", error);
      if (!mounted.current) return;
      setNotifs(prev => [notification, ...prev]);
    });
  };

  const deleteNotif = (id: string) => {
    const notification = notifs.find(n => n.id === id);
    if (!notification || pendingDeleteIds.current.has(id)) return;

    pendingDeleteIds.current.add(id);
    setNotifs(prev => prev.filter(n => n.id !== id));
    setPendingDeletes(prev => [
      ...prev.filter(item => item.notification.id !== id),
      { notification, expiresAt: Date.now() + 6000 },
    ]);

    const timer = window.setTimeout(() => finalizeDelete(notification), 6000);
    deleteTimers.current.set(id, timer);
  };

  const undoDelete = (id: string) => {
    const pending = pendingDeletes.find(item => item.notification.id === id);
    if (!pending) return;

    const timer = deleteTimers.current.get(id);
    if (timer) window.clearTimeout(timer);
    deleteTimers.current.delete(id);
    pendingDeleteIds.current.delete(id);
    setPendingDeletes(prev => prev.filter(item => item.notification.id !== id));
    setNotifs(prev => [pending.notification, ...prev]);
  };

  const saveMoveComment = () => {
    if (!selectedMove) return;
    const updated = updateBoardMoveComment(selectedMove.movementId, moveComment.trim());
    if (updated) setSelectedMove(updated);
  };
  const updateStatus = (id: string, status: "Approved" | "Rejected") => {
    setNotifs(prev => prev.map(n => n.id === id ? {
      ...n,
      read: false,
      title: `${status}: ${n.title.replace(/^(Approved|Rejected):\s*/, "")}`,
      message: `Status changed to ${status}. ${n.message.replace(/^Status changed to (Approved|Rejected)\.\s*/, "")}`,
    } : n));
  };

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
    return notifs.filter(n => getNotifStatus(n) === tab).length;
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
                onStatusUpdate={updateStatus}
                onOpenMoveDetails={setSelectedMove}
                onOpenTask={taskId => navigate(`/tasks?taskId=${encodeURIComponent(taskId)}`)}
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

      {pendingDeletes.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 space-y-2">
          {pendingDeletes.map(({ notification }) => (
            <div key={notification.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg">
              <span className="font-medium">Notification removed</span>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-primary" onClick={() => undoDelete(notification.id)}>
                Undo
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selectedMove)} onOpenChange={(open) => { if (!open) setSelectedMove(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Board Movement Details</DialogTitle>
          </DialogHeader>

          {selectedMove && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Card / Task</p>
                <p className="font-medium">{selectedMove.movement.cardName}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Old Status</p>
                  <p className="font-medium">{selectedMove.movement.oldStatus}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">New Status</p>
                  <p className="font-medium">{selectedMove.movement.newStatus}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Reason</p>
                  <p className="font-medium">
                    {selectedMove.movement.reason === "Other"
                      ? selectedMove.movement.customReason
                      : selectedMove.movement.reason}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Moved By</p>
                  <p className="font-medium">{selectedMove.movement.movedBy}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Date & Time</p>
                <p className="font-medium">{selectedMove.time}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">Comments / Description</p>
                <Textarea
                  className="mt-1 min-h-[90px]"
                  value={moveComment}
                  onChange={event => setMoveComment(event.target.value)}
                  placeholder="Add movement comment or description..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={saveMoveComment} disabled={!selectedMove}>
              Save Comment
            </Button>
            <Button onClick={() => setSelectedMove(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
