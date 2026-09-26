export type BoardMoveReason =
  | "Task Completed"
  | "Priority Changed"
  | "Assigned to Another Person"
  | "Deadline Changed"
  | "Issue Found"
  | "Rejected"
  | "Other";

export type BoardMoveAudit = {
  id: string;
  cardId: string;
  cardName: string;
  oldStatus: string;
  newStatus: string;
  reason: BoardMoveReason;
  customReason?: string;
  comment?: string;
  movedBy: string;
  movedAt: string;
};

export type BoardMoveNotification = {
  id: string;
  category: "Board";
  title: string;
  message: string;
  time: string;
  read: boolean;
  movementId: string;
  movement: BoardMoveAudit;
};

const AUDIT_KEY = "planyway-board-move-history";
const NOTIFICATION_KEY = "planyway-board-notifications";

function readList<T>(key: string): T[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T[] : [];
  } catch {
    return [];
  }
}

function saveList<T>(key: string, records: T[]) {
  localStorage.setItem(key, JSON.stringify(records));
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getBoardMoveNotifications(): BoardMoveNotification[] {
  return readList<BoardMoveNotification>(NOTIFICATION_KEY);
}

export function markBoardMoveNotificationRead(id: string) {
  const notifications = readList<BoardMoveNotification>(NOTIFICATION_KEY);
  saveList(NOTIFICATION_KEY, notifications.map(notification =>
    notification.id === id ? { ...notification, read: true } : notification
  ));
  window.dispatchEvent(new Event("planyway-board-notifications-updated"));
}

export function markAllBoardMoveNotificationsRead() {
  const notifications = readList<BoardMoveNotification>(NOTIFICATION_KEY);
  saveList(NOTIFICATION_KEY, notifications.map(notification => ({ ...notification, read: true })));
  window.dispatchEvent(new Event("planyway-board-notifications-updated"));
}

export function deleteBoardMoveNotification(id: string) {
  const notifications = readList<BoardMoveNotification>(NOTIFICATION_KEY);
  saveList(NOTIFICATION_KEY, notifications.filter(notification => notification.id !== id));
  window.dispatchEvent(new Event("planyway-board-notifications-updated"));
}

export function updateBoardMoveComment(movementId: string, comment: string): BoardMoveNotification | null {
  let updatedAudit: BoardMoveAudit | null = null;
  const history = readList<BoardMoveAudit>(AUDIT_KEY).map(audit => {
    if (audit.id !== movementId) return audit;
    updatedAudit = { ...audit, comment };
    return updatedAudit;
  });

  if (!updatedAudit) return null;
  saveList(AUDIT_KEY, history);

  let updatedNotification: BoardMoveNotification | null = null;
  const notifications = readList<BoardMoveNotification>(NOTIFICATION_KEY).map(notification => {
    if (notification.movementId !== movementId) return notification;
    updatedNotification = {
      ...notification,
      movement: updatedAudit!,
    };
    return updatedNotification;
  });
  saveList(NOTIFICATION_KEY, notifications);
  window.dispatchEvent(new Event("planyway-board-notifications-updated"));
  return updatedNotification;
}

export function createBoardMoveAudit(input: Omit<BoardMoveAudit, "id" | "movedAt">): BoardMoveAudit {
  const movedAt = new Date().toISOString();
  const audit: BoardMoveAudit = {
    id: `MOVE-${Date.now()}`,
    movedAt,
    ...input,
  };

  const history = readList<BoardMoveAudit>(AUDIT_KEY);
  saveList(AUDIT_KEY, [audit, ...history]);

  const displayReason = audit.reason === "Other" ? audit.customReason : audit.reason;
  const notification: BoardMoveNotification = {
    id: `BMN-${Date.now()}`,
    category: "Board",
    title: `Board Move: ${audit.cardName}`,
    message: `${audit.cardName} moved from ${audit.oldStatus} to ${audit.newStatus}. Reason: ${displayReason}. Moved by ${audit.movedBy} on ${formatDateTime(audit.movedAt)}.${audit.comment ? ` Comment: ${audit.comment}` : ""}`,
    time: formatDateTime(audit.movedAt),
    read: false,
    movementId: audit.id,
    movement: audit,
  };

  const notifications = readList<BoardMoveNotification>(NOTIFICATION_KEY);
  saveList(NOTIFICATION_KEY, [notification, ...notifications]);

  window.dispatchEvent(new Event("planyway-board-notifications-updated"));
  return audit;
}
