import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { emitToUser, emitToUsers } from "../lib/realtime";

const router: IRouter = Router();

type DbRow = Record<string, unknown>;
type Queryable = {
  query: typeof pool.query;
};

const REVIEWER_ROLES = ["ADMIN", "HR", "MANAGER", "EMPLOYEE"];
const FINAL_STATUSES = new Set(["Approved", "Rejected"]);

function asString(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function asDateString(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function normalizeLeaveType(value: unknown) {
  const raw = asString(value).trim();
  if (!raw) return "";
  return raw.endsWith("Leave") ? raw : `${raw} Leave`;
}

function normalizeStatus(value: unknown) {
  const status = asString(value).trim().toLowerCase();
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "";
}

function parseTimeMinutes(value: unknown) {
  const raw = asString(value, "09:00").trim();
  if (!raw) return 9 * 60;
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);
  if (!match) return 9 * 60;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = (match[3] ?? "").toLowerCase();
  if (meridiem === "pm" && hours !== 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  return Math.min(23 * 60 + 59, Math.max(0, hours * 60 + minutes));
}

function numericLeaveDuration(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function deriveLeaveDuration(startDate: string, endDate: string, startTime: unknown, endTime: unknown, halfDay: boolean, explicitDuration?: unknown, explicitLeaveDays?: unknown) {
  const explicit = numericLeaveDuration(explicitLeaveDays, numericLeaveDuration(explicitDuration, NaN));
  if (Number.isFinite(explicit) && explicit > 0) return Number(explicit);

  if (halfDay) return 0.5;

  const normalizedStartTime = asString(startTime, "09:00");
  const normalizedEndTime = asString(endTime, "18:00");
  const start = new Date(`${startDate}T${normalizedStartTime}:00`);
  const end = new Date(`${endDate}T${normalizedEndTime}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  if (end < start) return 0;

  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 0;

  const dayCount = diffMs / 86_400_000;
  const hours = Math.max(dayCount, 0.5);
  return Number(Math.max(hours, 0.5).toFixed(2));
}

function durationDays(startDate: string, endDate: string, halfDay: boolean, startTime?: unknown, endTime?: unknown, explicitDuration?: unknown, explicitLeaveDays?: unknown) {
  if (halfDay) return 0.5;
  if (!startDate || !endDate) return 0;
  const computed = deriveLeaveDuration(startDate, endDate, startTime ?? "09:00", endTime ?? "18:00", false, explicitDuration, explicitLeaveDays);
  return computed > 0 ? computed : 0;
}

function isReviewer(role: string) {
  return REVIEWER_ROLES.includes(role.toUpperCase());
}

async function reviewerUserIds(excludeUserId?: string) {
  const result = await pool.query<{ user_id: string }>(
    "SELECT user_id FROM users WHERE role = ANY($1::user_role[]) AND status = 'Active' AND ($2::text IS NULL OR user_id <> $2)",
    [REVIEWER_ROLES, excludeUserId ?? null],
  );
  return result.rows.map((row) => row.user_id);
}

async function insertNotifications(db: Queryable, userIds: string[], title: string, message: string, category = "Leave") {
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);
  if (!uniqueUserIds.length) return [];

  const result = await db.query<DbRow>(`
    INSERT INTO notifications (user_id, title, message, category)
    SELECT user_id, $2, $3, $4
    FROM unnest($1::text[]) AS user_id
    RETURNING id, user_id, title, message, category, read_at, created_at
  `, [uniqueUserIds, title, message, category]);

  return result.rows;
}

async function insertLeaveChannelActivity(db: Queryable, message: string, actorUserId: string | null) {
  const result = await db.query<{ id: number }>(`
    INSERT INTO chat_messages (conversation_id, sender_id, body, message_type)
    VALUES ('channel:leave-requests', $1, $2, 'system')
    RETURNING id
  `, [actorUserId, message]);
  return result.rows[0]?.id ?? null;
}

function mapLeave(row: DbRow) {
  const startDate = asDateString(row.start_date);
  const endDate = asDateString(row.end_date);
  const halfDay = Boolean(row.half_day);
  const role = asString(row.role, "EMPLOYEE").toUpperCase();
  const applicantId = asString(row.employee_code) || asString(row.trainee_code) || asString(row.user_id);

  return {
    id: String(row.id),
    userId: asString(row.user_id),
    applicantId,
    applicantRole: role,
    internName: asString(row.full_name),
    employeeName: asString(row.full_name),
    employeeId: applicantId,
    email: asString(row.email),
    type: asString(row.leave_type),
    startDate,
    endDate,
    reason: asString(row.reason),
    status: asString(row.status, "Pending"),
    duration: durationDays(startDate, endDate, halfDay, row.start_time, row.end_time, row.duration ?? row.leave_days ?? undefined, row.leave_days ?? undefined),
    halfDay,
    halfDayPeriod: asString(row.half_day_period),
    submittedAt: row.created_at instanceof Date ? row.created_at.toISOString() : asString(row.created_at),
    decidedBy: asString(row.decided_by),
    decidedAt: row.decided_at instanceof Date ? row.decided_at.toISOString() : asString(row.decided_at),
    rejectionReason: asString(row.decision_reason),
  };
}

async function findLeaveRows(viewerUserId: string, viewerRole: string, scope: "all" | "mine" = "all") {
  const params: unknown[] = [];
  let where = "";

  if (scope === "mine" || !isReviewer(viewerRole)) {
    params.push(viewerUserId);
    where = "WHERE lr.user_id = $1";
  }

  const result = await pool.query<DbRow>(`
    SELECT lr.id, lr.user_id, lr.leave_type, lr.start_date, lr.end_date, lr.start_time, lr.end_time,
           lr.reason, lr.status, lr.duration, lr.leave_days, lr.decided_by, lr.decision_reason,
           lr.decided_at, lr.created_at, lr.updated_at, lr.half_day, lr.half_day_period,
           u.full_name, u.email, u.role::text AS role,
           e.employee_code, t.trainee_code
    FROM leave_requests lr
    JOIN users u ON u.user_id = lr.user_id
    LEFT JOIN employees e ON e.user_id = lr.user_id
    LEFT JOIN trainees t ON t.user_id = lr.user_id
    ${where}
    ORDER BY lr.created_at DESC, lr.id DESC
  `, params);

  return result.rows.map(mapLeave);
}

async function findLeaveById(id: number) {
  const result = await pool.query<DbRow>(`
    SELECT lr.id, lr.user_id, lr.leave_type, lr.start_date, lr.end_date, lr.start_time, lr.end_time,
           lr.reason, lr.status, lr.duration, lr.leave_days, lr.decided_by, lr.decision_reason,
           lr.decided_at, lr.created_at, lr.updated_at, lr.half_day, lr.half_day_period,
           u.full_name, u.email, u.role::text AS role,
           e.employee_code, t.trainee_code
    FROM leave_requests lr
    JOIN users u ON u.user_id = lr.user_id
    LEFT JOIN employees e ON e.user_id = lr.user_id
    LEFT JOIN trainees t ON t.user_id = lr.user_id
    WHERE lr.id = $1
  `, [id]);

  return result.rows[0] ? mapLeave(result.rows[0]) : null;
}

router.get("/leave-requests", requireAuth, async (req, res): Promise<void> => {
  try {
    const scope = req.query.scope === "mine" ? "mine" : "all";
    const leaves = await findLeaveRows(req.authUser!.userId, req.authUser!.role, scope);
    res.json({ leaveRequests: leaves });
  } catch (error) {
    req.log?.error({ err: error }, "Leave request lookup failed");
    res.status(503).json({ error: "Unable to load leave requests from the database." });
  }
});

router.post("/leave-requests", requireAuth, async (req, res): Promise<void> => {
  const leaveType = normalizeLeaveType(req.body?.type ?? req.body?.leaveType);
  const startDate = asString(req.body?.startDate).trim();
  const endDate = asString(req.body?.endDate).trim();
  const startTime = asString(req.body?.startTime ?? req.body?.start_time, "09:00").trim() || "09:00";
  const endTime = asString(req.body?.endTime ?? req.body?.end_time, "18:00").trim() || "18:00";
  const reason = asString(req.body?.reason).trim();
  const halfDay = Boolean(req.body?.halfDay ?? req.body?.half_day);
  const halfDayPeriod = asString(req.body?.halfDayPeriod ?? req.body?.half_day_period).trim() || null;
  const explicitDuration = numericLeaveDuration(req.body?.duration ?? req.body?.leaveDays ?? req.body?.leave_days, NaN);

  if (!leaveType || !startDate || !endDate || !reason) {
    res.status(400).json({ error: "Leave type, start date, end date, and reason are required." });
    return;
  }
  if (endDate < startDate) {
    res.status(400).json({ error: "End date must be after start date." });
    return;
  }
  if (startDate === endDate && endTime && startTime && parseTimeMinutes(endTime) < parseTimeMinutes(startTime)) {
    res.status(400).json({ error: "End time must be after start time on the same day." });
    return;
  }
  if (reason.length < 15) {
    res.status(400).json({ error: "Reason must be at least 15 characters." });
    return;
  }

  const finalDuration = deriveLeaveDuration(startDate, endDate, startTime, endTime, halfDay, explicitDuration, req.body?.leaveDays ?? req.body?.leave_days);
  if (!Number.isFinite(finalDuration) || finalDuration <= 0) {
    res.status(400).json({ error: "Leave duration must be greater than zero." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query<{ id: number }>(`
      INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, start_time, end_time, reason, half_day, half_day_period, duration, leave_days)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [req.authUser!.userId, leaveType, startDate, endDate, startTime, endTime, reason, halfDay, halfDayPeriod, finalDuration, finalDuration]);

    const reviewers = await reviewerUserIds(req.authUser!.userId);
    const applicantName = req.authUser!.fullName;
    const title = "Leave request submitted";
    const notificationMessage = `${applicantName} submitted a ${leaveType} request.`;
    const notifications = await insertNotifications(client, reviewers, title, notificationMessage);
    await insertLeaveChannelActivity(client, "A leave request was submitted and is awaiting review.", req.authUser!.userId);
    await client.query("COMMIT");

    const leave = await findLeaveById(inserted.rows[0].id);
    const payload = { leave, notifications };
    emitToUsers(reviewers, "leave_request_created", payload);
    notifications.forEach((notification) => {
      emitToUser(asString(notification.user_id), "notification_created", notification);
    });

    res.status(201).json({ leaveRequest: leave });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    req.log?.error({ err: error }, "Leave request creation failed");
    res.status(503).json({ error: "Unable to submit leave request." });
  } finally {
    client.release();
  }
});

router.patch("/leave-requests/:id/status", requireAuth, async (req, res): Promise<void> => {
  const leaveId = Number(req.params.id);
  const status = normalizeStatus(req.body?.status);
  const decisionReason = asString(req.body?.reason ?? req.body?.decisionReason).trim() || null;

  if (!Number.isInteger(leaveId) || leaveId <= 0 || !FINAL_STATUSES.has(status)) {
    res.status(400).json({ error: "A valid leave ID and final status are required." });
    return;
  }
  if (status === "Rejected" && !decisionReason) {
    res.status(400).json({ error: "A rejection reason is required." });
    return;
  }
  if (!isReviewer(req.authUser!.role)) {
    res.status(403).json({ error: "You are not allowed to process leave requests." });
    return;
  }

  const current = await findLeaveById(leaveId);
  if (!current) {
    res.status(404).json({ error: "Leave request not found." });
    return;
  }
  if (current.userId === req.authUser!.userId) {
    res.status(403).json({ error: "You cannot approve or reject your own leave request." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      UPDATE leave_requests
      SET status = $1,
          decided_by = $2,
          decision_reason = $3,
          decided_at = NOW(),
          updated_at = NOW()
      WHERE id = $4
    `, [status, req.authUser!.userId, decisionReason, leaveId]);

    const title = status === "Approved" ? "Leave request approved" : "Leave request rejected";
    const applicantMessage = status === "Approved"
      ? `Your ${current.type} request has been approved.`
      : `Your ${current.type} request has been rejected.`;
    const notifications = await insertNotifications(client, [current.userId], title, applicantMessage);
    await insertLeaveChannelActivity(client, `A leave request was ${status.toLowerCase()}.`, req.authUser!.userId);
    await client.query("COMMIT");

    const leave = await findLeaveById(leaveId);
    const eventName = status === "Approved" ? "leave_request_approved" : "leave_request_rejected";
    const reviewers = await reviewerUserIds();
    emitToUser(current.userId, eventName, { leave, notifications });
    emitToUsers(reviewers, eventName, { leave });
    notifications.forEach((notification) => {
      emitToUser(asString(notification.user_id), "notification_created", notification);
    });

    res.json({ leaveRequest: leave });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    req.log?.error({ err: error }, "Leave request status update failed");
    res.status(503).json({ error: "Unable to update leave request status." });
  } finally {
    client.release();
  }
});

export default router;
