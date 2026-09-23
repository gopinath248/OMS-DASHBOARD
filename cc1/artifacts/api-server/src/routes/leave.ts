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

function durationDays(startDate: string, endDate: string, halfDay: boolean) {
  if (halfDay) return 0.5;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
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
    duration: durationDays(startDate, endDate, halfDay),
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
    SELECT lr.id, lr.user_id, lr.leave_type, lr.start_date, lr.end_date, lr.reason, lr.status,
           lr.decided_by, lr.decision_reason, lr.decided_at, lr.created_at, lr.updated_at,
           lr.half_day, lr.half_day_period,
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
    SELECT lr.id, lr.user_id, lr.leave_type, lr.start_date, lr.end_date, lr.reason, lr.status,
           lr.decided_by, lr.decision_reason, lr.decided_at, lr.created_at, lr.updated_at,
           lr.half_day, lr.half_day_period,
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
  const reason = asString(req.body?.reason).trim();
  const halfDay = Boolean(req.body?.halfDay);
  const halfDayPeriod = asString(req.body?.halfDayPeriod).trim() || null;

  if (!leaveType || !startDate || !endDate || !reason) {
    res.status(400).json({ error: "Leave type, start date, end date, and reason are required." });
    return;
  }
  if (endDate < startDate) {
    res.status(400).json({ error: "End date must be after start date." });
    return;
  }
  if (reason.length < 15) {
    res.status(400).json({ error: "Reason must be at least 15 characters." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query<{ id: number }>(`
      INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, reason, half_day, half_day_period)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [req.authUser!.userId, leaveType, startDate, endDate, reason, halfDay, halfDayPeriod]);

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
