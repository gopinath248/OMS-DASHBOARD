export type ChatPresenceState = {
  userId: string;
  online: boolean;
};

const presenceByUserId = new Map<string, boolean>();

export function recordChatPresence(presence: ChatPresenceState) {
  presenceByUserId.set(presence.userId, presence.online);
}

export function getChatPresence(userId: string): boolean | undefined {
  return presenceByUserId.get(userId);
}

export function getChatPresenceSnapshot() {
  return new Map(presenceByUserId);
}
