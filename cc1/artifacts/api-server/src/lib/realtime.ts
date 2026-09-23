import type { Response } from "express";

type SseClient = {
  id: string;
  userId: string;
  res: Response;
};

const clients = new Map<string, SseClient>();

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
  clients.set(id, client);
  emitToClient(client, "connected", { userId, connectedAt: new Date().toISOString() });

  emitToAll("presence", { userId, online: true });

  const heartbeat = setInterval(() => {
    emitToClient(client, "heartbeat", { at: new Date().toISOString() });
  }, 25_000);

  onClose(() => {
    clearInterval(heartbeat);
    clients.delete(id);
    if (![...clients.values()].some((connectedClient) => connectedClient.userId === userId)) {
      emitToAll("presence", { userId, online: false });
    }
  });
}

export function getOnlineUserIds() {
  return new Set([...clients.values()].map((client) => client.userId));
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
