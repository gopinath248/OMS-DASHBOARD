import type { Response } from "express";

type SseClient = {
  id: string;
  userId: string;
  res: Response;
};

const clients = new Map<string, SseClient>();
const offlineTimers = new Map<string, ReturnType<typeof setTimeout>>();
const authenticatedOnlineUserIds = new Set<string>();

function sendEvent(client: SseClient, event: string, data: unknown) {
  client.res.write(`event: ${event}\n`);
  client.res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function addSseClient(userId: string, res: Response, onClose: (handler: () => void) => void) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const id = `${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const client: SseClient = { id, userId, res };
  const offlineTimer = offlineTimers.get(userId);
  if (offlineTimer) {
    clearTimeout(offlineTimer);
    offlineTimers.delete(userId);
  }

  clients.set(id, client);
  authenticatedOnlineUserIds.add(userId);
  emitToClient(client, "connected", { userId, connectedAt: new Date().toISOString() });

  emitToAll("presence", { userId, online: true });

  const heartbeat = setInterval(() => {
    emitToClient(client, "heartbeat", { at: new Date().toISOString() });
  }, 25_000);

  onClose(() => {
    clearInterval(heartbeat);
    clients.delete(id);
    if (![...clients.values()].some((connectedClient) => connectedClient.userId === userId)) {
      const timer = setTimeout(() => {
        offlineTimers.delete(userId);
        if (
          !authenticatedOnlineUserIds.has(userId) &&
          ![...clients.values()].some((connectedClient) => connectedClient.userId === userId)
        ) {
          emitToAll("presence", { userId, online: false });
        }
      }, 3000);
      offlineTimers.set(userId, timer);
    }
  });
}

export function getOnlineUserIds() {
  return new Set([
    ...authenticatedOnlineUserIds,
    ...[...clients.values()].map((client) => client.userId),
  ]);
}

export function markUserOnline(userId: string) {
  const offlineTimer = offlineTimers.get(userId);
  if (offlineTimer) {
    clearTimeout(offlineTimer);
    offlineTimers.delete(userId);
  }
  authenticatedOnlineUserIds.add(userId);
  emitToAll("presence", { userId, online: true });
}

export function markUserOffline(userId: string) {
  authenticatedOnlineUserIds.delete(userId);
  for (const [clientId, client] of clients.entries()) {
    if (client.userId === userId) clients.delete(clientId);
  }
  const offlineTimer = offlineTimers.get(userId);
  if (offlineTimer) {
    clearTimeout(offlineTimer);
    offlineTimers.delete(userId);
  }
  emitToAll("presence", { userId, online: false });
}

export function emitToClient(client: SseClient, event: string, data: unknown) {
  sendEvent(client, event, data);
}

export function emitToUser(userId: string, event: string, data: unknown) {
  for (const client of clients.values()) {
    if (client.userId === userId) {
      sendEvent(client, event, data);
    }
  }
}

export function emitToUsers(userIds: Iterable<string>, event: string, data: unknown) {
  const allowed = new Set(userIds);
  for (const client of clients.values()) {
    if (allowed.has(client.userId)) {
      sendEvent(client, event, data);
    }
  }
}

export function emitToAll(event: string, data: unknown) {
  for (const client of clients.values()) {
    sendEvent(client, event, data);
  }
}
