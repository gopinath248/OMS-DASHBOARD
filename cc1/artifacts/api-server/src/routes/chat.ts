import { Router, type IRouter } from "express";
import jwt from "jsonwebtoken";
import { pool } from "@workspace/db";
import { requireAuth, type AuthJwtPayload } from "../middlewares/auth";
import { addSseClient, emitToAll, emitToUsers, getOnlineUserIds } from "../lib/realtime";

const router: IRouter = Router();

type DbRow = Record<string, unknown>;

function jwtSecret(): string {
  return process.env.JWT_SECRET ?? process.env.SESSION_SECRET ?? "planway-dev-secret-key";
}

function asString(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";
}

function roleLabel(role: string): "Admin" | "Employee" | "Intern" {
  if (role === "ADMIN") return "Admin";
  if (role === "INTERN") return "Intern";
  return "Employee";
}

function directKey(userA: string, userB: string) {
  return [userA, userB].sort((a, b) => a.localeCompare(b)).join(":");
}

function conversationOtherUserId(key: string, selfUserId: string) {
  return key.split(":").find((id) => id !== selfUserId) ?? "";
}

async function conversationParticipantIds(conversationId: string) {
  const result = await pool.query<{ user_id: string }>(
    "SELECT user_id FROM chat_conversation_members WHERE conversation_id = $1",
    [conversationId],
  );
  return result.rows.map((row) => row.user_id);
}

async function canAccessConversation(conversationId: string, userId: string) {
  const result = await pool.query<{ kind: string; is_member: boolean }>(`
    SELECT c.kind,
           EXISTS (
             SELECT 1 FROM chat_conversation_members m
             WHERE m.conversation_id = c.id AND m.user_id = $2
           ) AS is_member
    FROM chat_conversations c
    WHERE c.id = $1
  `, [conversationId, userId]);

  const row = result.rows[0];
  return Boolean(row?.is_member || row?.kind === "channel");
}

async function emitToConversation(conversationId: string, event: string, data: unknown) {
  const participants = await conversationParticipantIds(conversationId);
  const conversation = await pool.query<{ kind: string }>("SELECT kind FROM chat_conversations WHERE id = $1", [conversationId]);
  const isChannel = conversation.rows[0]?.kind === "channel";

  if (isChannel) emitToAll(event, data);
  else emitToUsers(participants, event, data);
}

async function unreadSummary(userId: string) {
  const result = await pool.query<{ total_unread: number }>(`
    SELECT count(msg.id)::int AS total_unread
    FROM chat_conversation_members mine
    JOIN chat_conversations c ON c.id = mine.conversation_id
    JOIN chat_messages msg ON msg.conversation_id = c.id AND msg.deleted_at IS NULL
    LEFT JOIN chat_reads r ON r.conversation_id = c.id AND r.user_id = mine.user_id
    WHERE mine.user_id = $1
      AND msg.sender_id IS DISTINCT FROM $1
      AND (
        (r.last_read_message_id IS NOT NULL AND msg.id > r.last_read_message_id)
        OR (
          r.last_read_message_id IS NULL
          AND msg.created_at > COALESCE(r.last_read_at, mine.last_read_at, mine.joined_at, '-infinity'::timestamptz)
        )
      )
  `, [userId]);

  return { totalUnread: asNumber(result.rows[0]?.total_unread) };
}

async function ensureChannelMemberships() {
  await pool.query(`
    INSERT INTO chat_conversation_members (conversation_id, user_id, member_role)
    SELECT c.id, u.user_id, 'member'
    FROM chat_conversations c
    CROSS JOIN users u
    WHERE c.kind = 'channel' AND u.status = 'Active'
    ON CONFLICT (conversation_id, user_id) DO NOTHING
  `);
}

async function formatMessage(messageId: number, viewerUserId: string) {
  const result = await pool.query<DbRow>(`
    SELECT m.id, m.conversation_id, m.sender_id, m.body, m.message_type,
           m.is_pinned, m.reply_to_message_id, m.attachment,
           m.created_at, m.updated_at, m.edited_at, m.deleted_at,
           u.full_name, u.role::text AS role, u.avatar_url,
           reply.body AS reply_body,
           reply_user.full_name AS reply_user_name,
           COALESCE(
             json_agg(
               DISTINCT jsonb_build_object(
                 'emoji', r.reaction,
                 'count', rc.reaction_count,
                 'reacted', EXISTS (
                   SELECT 1 FROM chat_message_reactions own
                   WHERE own.message_id = m.id
                     AND own.user_id = $2
                     AND own.reaction = r.reaction
                 )
               )
             ) FILTER (WHERE r.reaction IS NOT NULL),
             '[]'::json
           ) AS reactions
    FROM chat_messages m
    LEFT JOIN users u ON u.user_id = m.sender_id
    LEFT JOIN chat_messages reply ON reply.id = m.reply_to_message_id
    LEFT JOIN users reply_user ON reply_user.user_id = reply.sender_id
    LEFT JOIN chat_message_reactions r ON r.message_id = m.id
    LEFT JOIN (
      SELECT message_id, reaction, count(*)::int AS reaction_count
      FROM chat_message_reactions
      GROUP BY message_id, reaction
    ) rc ON rc.message_id = r.message_id AND rc.reaction = r.reaction
    WHERE m.id = $1
    GROUP BY m.id, u.full_name, u.role, u.avatar_url, reply.body, reply_user.full_name
  `, [messageId, viewerUserId]);

  const row = result.rows[0];
  if (!row) return null;

  const fullName = asString(row.full_name, "Unknown User");
  const role = roleLabel(asString(row.role, "EMPLOYEE"));
  const createdAt = row.created_at instanceof Date ? row.created_at : new Date(asString(row.created_at));

  return {
    id: String(row.id),
    conversationId: asString(row.conversation_id),
    senderId: row.sender_id === null || row.sender_id === undefined ? null : asString(row.sender_id),
    user: fullName,
    avatar: initials(fullName),
    avatarUrl: row.avatar_url === null || row.avatar_url === undefined ? null : asString(row.avatar_url),
    role,
    time: createdAt.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }),
    createdAt: createdAt.toISOString(),
    message: row.deleted_at ? "This message was deleted." : asString(row.body),
    messageType: asString(row.message_type, "text"),
    pinned: Boolean(row.is_pinned),
    reactions: Array.isArray(row.reactions) ? row.reactions : [],
    replyTo: row.reply_to_message_id === null || row.reply_to_message_id === undefined ? undefined : String(row.reply_to_message_id),
    replyUser: row.reply_user_name === null || row.reply_user_name === undefined ? undefined : asString(row.reply_user_name),
    replySnippet: row.reply_body === null || row.reply_body === undefined ? undefined : asString(row.reply_body).slice(0, 80),
    attachment: row.attachment ?? null,
    editedAt: row.edited_at ?? null,
    deletedAt: row.deleted_at ?? null,
  };
}

router.get("/chat/bootstrap", requireAuth, async (req, res): Promise<void> => {
  await ensureChannelMemberships();
  const onlineUserIds = getOnlineUserIds();

  const [channelRows, dmRows, userRows] = await Promise.all([
    pool.query<DbRow>(`
      SELECT c.id, c.title, c.description, c.avatar,
             count(DISTINCT m.user_id)::int AS members,
             count(DISTINCT msg.id)::int AS message_count,
             max(msg.created_at) AS last_message_at,
             latest.body AS last_message,
             count(DISTINCT unread_msg.id)::int AS unread
      FROM chat_conversations c
      JOIN chat_conversation_members mine ON mine.conversation_id = c.id AND mine.user_id = $1
      LEFT JOIN chat_conversation_members m ON m.conversation_id = c.id
      LEFT JOIN chat_messages msg ON msg.conversation_id = c.id AND msg.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT left(body, 240) AS body
        FROM chat_messages
        WHERE conversation_id = c.id AND deleted_at IS NULL
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      ) latest ON TRUE
      LEFT JOIN chat_reads r ON r.conversation_id = c.id AND r.user_id = mine.user_id
      LEFT JOIN chat_messages unread_msg ON unread_msg.conversation_id = c.id
        AND unread_msg.deleted_at IS NULL
        AND unread_msg.sender_id IS DISTINCT FROM $1
        AND (
          (r.last_read_message_id IS NOT NULL AND unread_msg.id > r.last_read_message_id)
          OR (
            r.last_read_message_id IS NULL
            AND unread_msg.created_at > COALESCE(r.last_read_at, mine.last_read_at, mine.joined_at, '-infinity'::timestamptz)
          )
        )
      WHERE c.kind = 'channel'
      GROUP BY c.id, latest.body
      ORDER BY c.created_at, c.id
    `, [req.authUser!.userId]),
    pool.query<DbRow>(`
      SELECT c.id, c.title, c.direct_key,
             max(msg.created_at) AS last_message_at,
             latest.body AS last_message,
             count(DISTINCT unread_msg.id)::int AS unread
      FROM chat_conversations c
      JOIN chat_conversation_members mine ON mine.conversation_id = c.id AND mine.user_id = $1
      LEFT JOIN chat_messages msg ON msg.conversation_id = c.id AND msg.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT left(body, 240) AS body
        FROM chat_messages
        WHERE conversation_id = c.id AND deleted_at IS NULL
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      ) latest ON TRUE
      LEFT JOIN chat_reads r ON r.conversation_id = c.id AND r.user_id = mine.user_id
      LEFT JOIN chat_messages unread_msg ON unread_msg.conversation_id = c.id
        AND unread_msg.deleted_at IS NULL
        AND unread_msg.sender_id IS DISTINCT FROM $1
        AND (
          (r.last_read_message_id IS NOT NULL AND unread_msg.id > r.last_read_message_id)
          OR (
            r.last_read_message_id IS NULL
            AND unread_msg.created_at > COALESCE(r.last_read_at, mine.last_read_at, mine.joined_at, '-infinity'::timestamptz)
          )
        )
      WHERE c.kind = 'direct'
      GROUP BY c.id, latest.body
      ORDER BY max(msg.created_at) DESC NULLS LAST, c.updated_at DESC
    `, [req.authUser!.userId]),
    pool.query<DbRow>(`
      SELECT u.user_id, u.full_name, u.email, u.role::text AS role, u.status, u.avatar_url,
             COALESCE(e.phone, t.phone) AS phone
      FROM users u
      LEFT JOIN employees e ON e.user_id = u.user_id
      LEFT JOIN trainees t ON t.user_id = u.user_id
      WHERE u.status = 'Active' AND u.user_id <> $1
      ORDER BY u.role::text, u.full_name
    `, [req.authUser!.userId]),
  ]);

  const dmUnreadByUserId: Record<string, number> = {};
  dmRows.rows.forEach((row) => {
    const otherUserId = conversationOtherUserId(asString(row.direct_key), req.authUser!.userId);
    if (otherUserId) dmUnreadByUserId[otherUserId] = asNumber(row.unread);
  });

  res.json({
    channels: channelRows.rows.map((row) => ({
      id: asString(row.id),
      name: asString(row.title),
      description: asString(row.description),
      icon: asString(row.avatar, "Hash"),
      unread: asNumber(row.unread),
      members: asNumber(row.members),
      messageCount: asNumber(row.message_count),
      lastMessage: asString(row.last_message),
      lastMessageAt: row.last_message_at ?? null,
    })),
    directConversations: dmRows.rows.map((row) => ({
      id: asString(row.id),
      title: asString(row.title),
      directKey: asString(row.direct_key),
      lastMessage: asString(row.last_message),
      lastMessageAt: row.last_message_at ?? null,
    })),
    users: userRows.rows.map((row) => {
      const fullName = asString(row.full_name);
      return {
        id: asString(row.user_id),
        name: fullName,
        email: asString(row.email),
        avatar: initials(fullName),
        avatarUrl: row.avatar_url === null || row.avatar_url === undefined ? null : asString(row.avatar_url),
        role: roleLabel(asString(row.role)),
        status: onlineUserIds.has(asString(row.user_id)) ? "online" : "offline",
        phone: asString(row.phone),
        unread: dmUnreadByUserId[asString(row.user_id)] ?? 0,
      };
    }),
  });
});

router.get("/chat/unread-summary", requireAuth, async (req, res): Promise<void> => {
  res.json(await unreadSummary(req.authUser!.userId));
});

router.get("/chat/conversations/:conversationId/members", requireAuth, async (req, res): Promise<void> => {
  const conversationId = asString(req.params.conversationId);
  if (!await canAccessConversation(conversationId, req.authUser!.userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const result = await pool.query<DbRow>(`
    SELECT u.user_id, u.full_name, u.email, u.role::text AS role, u.status, u.avatar_url,
           COALESCE(e.phone, t.phone) AS phone
    FROM chat_conversation_members m
    JOIN users u ON u.user_id = m.user_id
    LEFT JOIN employees e ON e.user_id = u.user_id
    LEFT JOIN trainees t ON t.user_id = u.user_id
    WHERE m.conversation_id = $1
      AND u.status = 'Active'
    ORDER BY u.full_name
  `, [conversationId]);

  res.json({
    members: result.rows.map((row) => {
      const fullName = asString(row.full_name);
      return {
        id: asString(row.user_id),
        name: fullName,
        email: asString(row.email),
        avatar: initials(fullName),
        avatarUrl: row.avatar_url === null || row.avatar_url === undefined ? null : asString(row.avatar_url),
        role: roleLabel(asString(row.role)),
        status: getOnlineUserIds().has(asString(row.user_id)) ? "online" : "offline",
        phone: asString(row.phone),
      };
    }),
  });
});

router.get("/chat/conversations/:conversationId/messages", requireAuth, async (req, res): Promise<void> => {
  const conversationId = asString(req.params.conversationId);
  if (!await canAccessConversation(conversationId, req.authUser!.userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const limit = Math.min(Math.max(asNumber(req.query.limit, 50), 1), 100);
  const beforeId = req.query.beforeId ? asNumber(req.query.beforeId) : null;

  const params: unknown[] = [conversationId, limit];
  let beforeSql = "";
  if (beforeId) {
    params.push(beforeId);
    beforeSql = "AND (m.created_at, m.id) < (SELECT created_at, id FROM chat_messages WHERE id = $3)";
  }

  const result = await pool.query<{ id: number }>(`
    SELECT m.id
    FROM chat_messages m
    WHERE m.conversation_id = $1
      ${beforeSql}
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT $2
  `, params);

  const messages = (await Promise.all(
    result.rows.reverse().map((row) => formatMessage(row.id, req.authUser!.userId)),
  )).filter(Boolean);

  res.json({ messages, hasMore: result.rows.length === limit });
});

router.post("/chat/conversations/:conversationId/read", requireAuth, async (req, res): Promise<void> => {
  const conversationId = asString(req.params.conversationId);
  if (!await canAccessConversation(conversationId, req.authUser!.userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const latest = await pool.query<{ id: number | null }>(
    "SELECT max(id)::int AS id FROM chat_messages WHERE conversation_id = $1 AND deleted_at IS NULL",
    [conversationId],
  );
  const latestMessageId = latest.rows[0]?.id ?? null;

  await pool.query(`
    INSERT INTO chat_reads (conversation_id, user_id, last_read_message_id, last_read_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (conversation_id, user_id) DO UPDATE SET
      last_read_message_id = EXCLUDED.last_read_message_id,
      last_read_at = EXCLUDED.last_read_at
  `, [conversationId, req.authUser!.userId, latestMessageId]);
  await pool.query(`
    UPDATE chat_conversation_members
    SET last_read_at = NOW()
    WHERE conversation_id = $1 AND user_id = $2
  `, [conversationId, req.authUser!.userId]);

  res.json(await unreadSummary(req.authUser!.userId));
});

router.post("/chat/conversations/direct", requireAuth, async (req, res): Promise<void> => {
  const targetUserId = asString(req.body?.targetUserId).trim();
  if (!targetUserId || targetUserId === req.authUser!.userId) {
    res.status(400).json({ error: "Valid targetUserId is required." });
    return;
  }

  const target = await pool.query<{ user_id: string; full_name: string }>(
    "SELECT user_id, full_name FROM users WHERE user_id = $1 AND status = 'Active'",
    [targetUserId],
  );
  if (!target.rowCount) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  const key = directKey(req.authUser!.userId, targetUserId);
  const id = `direct:${key}`;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const saved = await client.query<DbRow>(`
      INSERT INTO chat_conversations (id, kind, title, direct_key, created_by)
      VALUES ($1, 'direct', $2, $3, $4)
      ON CONFLICT (direct_key) DO UPDATE SET updated_at = NOW()
      RETURNING id, title, direct_key
    `, [id, target.rows[0].full_name, key, req.authUser!.userId]);
    await client.query(`
      INSERT INTO chat_conversation_members (conversation_id, user_id, member_role)
      VALUES ($1, $2, 'member'), ($1, $3, 'member')
      ON CONFLICT (conversation_id, user_id) DO NOTHING
    `, [saved.rows[0].id, req.authUser!.userId, targetUserId]);
    await client.query("COMMIT");
    res.status(201).json({ conversation: saved.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

router.post("/chat/conversations/:conversationId/messages", requireAuth, async (req, res): Promise<void> => {
  const conversationId = asString(req.params.conversationId);
  const body = asString(req.body?.message ?? req.body?.body).trim();
  const clientMessageId = asString(req.body?.clientMessageId).trim() || null;
  const messageType = asString(req.body?.messageType, "text");
  const replyToMessageId = req.body?.replyToMessageId ? asNumber(req.body.replyToMessageId) : null;
  const attachment = req.body?.attachment ?? null;

  if (!body && !attachment) {
    res.status(400).json({ error: "Message body or attachment is required." });
    return;
  }

  if (!await canAccessConversation(conversationId, req.authUser!.userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const saved = await pool.query<{ id: number }>(`
    INSERT INTO chat_messages (
      conversation_id, sender_id, body, client_message_id, message_type, reply_to_message_id, attachment
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    ON CONFLICT (sender_id, client_message_id) WHERE client_message_id IS NOT NULL
    DO UPDATE SET updated_at = chat_messages.updated_at
    RETURNING id
  `, [
    conversationId,
    req.authUser!.userId,
    body,
    clientMessageId,
    messageType,
    replyToMessageId,
    attachment ? JSON.stringify(attachment) : null,
  ]);

  const message = await formatMessage(saved.rows[0].id, req.authUser!.userId);
  await emitToConversation(conversationId, "message", message);
  res.status(201).json({ message });
});

router.post("/chat/messages/:messageId/reactions", requireAuth, async (req, res): Promise<void> => {
  const messageId = asNumber(req.params.messageId);
  const reaction = asString(req.body?.emoji ?? req.body?.reaction).trim();
  if (!messageId || !reaction) {
    res.status(400).json({ error: "Message ID and reaction are required." });
    return;
  }

  const message = await pool.query<{ conversation_id: string }>(
    "SELECT conversation_id FROM chat_messages WHERE id = $1",
    [messageId],
  );
  const conversationId = message.rows[0]?.conversation_id;
  if (!conversationId || !await canAccessConversation(conversationId, req.authUser!.userId)) {
    res.status(404).json({ error: "Message not found." });
    return;
  }

  const existing = await pool.query<{ reaction: string }>(
    "SELECT reaction FROM chat_message_reactions WHERE message_id = $1 AND user_id = $2 LIMIT 1",
    [messageId, req.authUser!.userId],
  );
  if (existing.rows[0]?.reaction === reaction) {
    await pool.query("DELETE FROM chat_message_reactions WHERE message_id = $1 AND user_id = $2", [messageId, req.authUser!.userId]);
  } else {
    await pool.query("DELETE FROM chat_message_reactions WHERE message_id = $1 AND user_id = $2", [messageId, req.authUser!.userId]);
    await pool.query(`
      INSERT INTO chat_message_reactions (message_id, user_id, reaction)
      VALUES ($1, $2, $3)
      ON CONFLICT (message_id, user_id, reaction) DO NOTHING
    `, [messageId, req.authUser!.userId, reaction]);
  }

  const formatted = await formatMessage(messageId, req.authUser!.userId);
  await emitToConversation(conversationId, "reaction", formatted);
  res.json({ message: formatted });
});

router.post("/chat/typing", requireAuth, async (req, res): Promise<void> => {
  const conversationId = asString(req.body?.conversationId);
  const isTyping = Boolean(req.body?.isTyping);
  if (!conversationId || !await canAccessConversation(conversationId, req.authUser!.userId)) {
    res.status(400).json({ error: "Valid conversationId is required." });
    return;
  }

  await emitToConversation(conversationId, "typing", {
    conversationId,
    userId: req.authUser!.userId,
    fullName: req.authUser!.fullName,
    isTyping,
  });
  res.sendStatus(204);
});

router.get("/chat/events", async (req, res): Promise<void> => {
  const token = asString(req.query.token);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let authUser: AuthJwtPayload;
  try {
    authUser = jwt.verify(token, jwtSecret()) as AuthJwtPayload;
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  addSseClient(authUser.userId, res, (handler) => req.on("close", handler));
});

export default router;
