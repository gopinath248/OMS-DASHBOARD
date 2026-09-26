import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { emitToAll, emitToUser } from "../lib/realtime";

const router: IRouter = Router();

type DbRow = Record<string, unknown>;
type Queryable = {
  query: typeof pool.query;
};

const VALID_STATUSES = new Set(["To Do", "In Progress", "Testing", "Review", "Blocked", "Done", "Completed"]);
const VALID_PRIORITIES = new Set(["Low", "Medium", "High", "Critical"]);

function asString(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function normalizeStatus(value: unknown) {
  const status = asString(value, "To Do").trim();
  return VALID_STATUSES.has(status) ? status : "To Do";
}

function normalizePriority(value: unknown) {
  const priority = asString(value, "Medium").trim();
  return VALID_PRIORITIES.has(priority) ? priority : "Medium";
}

function normalizeOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeDueAt(value: unknown) {
  const raw = asString(value).trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : raw;
}

function asDateString(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function mapTask(row: DbRow) {
  return {
    id: String(row.id),
    title: asString(row.title),
    description: asString(row.description),
    assignedTo: asString(row.assigned_name),
    assignedToUserId: asString(row.assigned_to),
    createdByUserId: asString(row.created_by),
    projectId: asString(row.project_id),
    projectName: asString(row.project_name),
    priority: asString(row.priority, "Medium"),
    dueDate: asDateString(row.due_at),
    status: asString(row.status, "To Do"),
    attachments: 0,
  };
}

function isAdminLikeRole(role: string) {
  return ["ADMIN", "HR", "MANAGER"].includes(role.toUpperCase());
}

function hasAdminOnlyPatchFields(body: Record<string, unknown>) {
  return ["title", "description", "assignedTo", "assignedToUserId", "priority", "dueDate", "dueAt", "projectId", "sprintId"].some((key) =>
    body[key] !== undefined
  );
}

async function findAdminEmployeeAssignee(db: Queryable, value: unknown) {
  const assignee = asString(value).trim();
  if (!assignee) return null;

  const result = await db.query<DbRow>(`
    SELECT u.user_id, u.full_name
    FROM employees e
    JOIN users u ON u.user_id = e.user_id
    WHERE e.status = 'Active'
      AND u.status = 'Active'
      AND u.role = 'EMPLOYEE'::user_role
      AND (
        lower(u.full_name) = lower($1)
        OR lower(e.employee_code) = lower($1)
        OR lower(u.user_id) = lower($1)
      )
    LIMIT 1
  `, [assignee]);

  return result.rows[0] ?? null;
}

async function findEmployeeInternAssignee(db: Queryable, value: unknown, employeeUserId: string) {
  const assignee = asString(value).trim();
  if (!assignee) return null;

  const result = await db.query<DbRow>(`
    WITH current_employee AS (
      SELECT e.employee_code, e.user_id, u.full_name
      FROM employees e
      JOIN users u ON u.user_id = e.user_id
      WHERE e.user_id = $2
      LIMIT 1
    )
    SELECT u.user_id, u.full_name
    FROM trainees t
    JOIN users u ON u.user_id = t.user_id
    CROSS JOIN current_employee ce
    WHERE t.status = 'Active'
      AND u.status = 'Active'
      AND (
        lower(u.full_name) = lower($1)
        OR lower(t.trainee_code) = lower($1)
        OR lower(u.user_id) = lower($1)
      )
      AND (
        lower(COALESCE(t.manager, '')) IN (
          lower(ce.full_name),
          lower(ce.employee_code),
          lower(ce.user_id)
        )
        OR EXISTS (
          SELECT 1
          FROM project_members intern_member
          JOIN project_members employee_member
            ON employee_member.project_id = intern_member.project_id
           AND employee_member.user_id = ce.user_id
          WHERE intern_member.user_id = t.user_id
        )
      )
    LIMIT 1
  `, [assignee, employeeUserId]);

  return result.rows[0] ?? null;
}

async function findAssignableUser(db: Queryable, value: unknown, actorRole: string, actorUserId: string) {
  if (actorRole === "EMPLOYEE") return findEmployeeInternAssignee(db, value, actorUserId);
  if (isAdminLikeRole(actorRole)) return findAdminEmployeeAssignee(db, value);
  return null;
}

async function loadTask(db: Queryable, taskId: number) {
  const result = await db.query<DbRow>(`
    SELECT t.id, t.project_id, t.sprint_id, t.title, t.description, t.status, t.priority,
           t.due_at, t.assigned_to, t.created_by,
           u.full_name AS assigned_name, p.name AS project_name
    FROM tasks t
    LEFT JOIN users u ON u.user_id = t.assigned_to
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE t.id = $1
  `, [taskId]);
  return result.rows[0] ?? null;
}

async function insertNotification(db: Queryable, userId: string, task: DbRow, assignedBy: string) {
  const projectName = asString(task.project_name);
  const result = await db.query<DbRow>(`
    INSERT INTO notifications (user_id, title, message, category)
    VALUES ($1, $2, $3, 'Task')
    RETURNING id, user_id, title, message, category, read_at, created_at
  `, [
    userId,
    "New Task Assigned",
    `Task ID ${String(task.id)}. ${assignedBy} assigned: ${asString(task.title)}. Assigned by: ${assignedBy}.${projectName ? ` Project: ${projectName}.` : ""}`,
  ]);

  return result.rows[0] ?? null;
}

async function insertProjectMoveNotification(
  db: Queryable,
  userId: string,
  task: DbRow,
  fromProject: string,
  toProject: string,
  movedBy: string,
) {
  const result = await db.query<DbRow>(`
    INSERT INTO notifications (user_id, title, message, category)
    VALUES ($1, $2, $3, 'Task')
    RETURNING id, user_id, title, message, category, read_at, created_at
  `, [
    userId,
    "Task Project Moved",
    `Task ID ${String(task.id)}. ${movedBy} moved task: ${asString(task.title)}. Project moved: ${fromProject || "Unassigned"} -> ${toProject || "Unassigned"}.`,
  ]);

  return result.rows[0] ?? null;
}

router.post("/tasks", requireAuth, async (req, res): Promise<void> => {
  const actorRole = req.authUser!.role;
  if (actorRole === "INTERN") {
    res.status(403).json({ error: "Interns cannot create tasks." });
    return;
  }

  const title = asString(req.body?.title).trim();
  const description = asString(req.body?.description);
  const priority = normalizePriority(req.body?.priority);
  const status = normalizeStatus(req.body?.status ?? req.body?.column);
  const dueAt = normalizeDueAt(req.body?.dueDate ?? req.body?.dueAt);
  const projectId = normalizeOptionalNumber(req.body?.projectId);
  const sprintId = normalizeOptionalNumber(req.body?.sprintId);

  if (!title) {
    res.status(400).json({ error: "Task title is required." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const assignee = await findAssignableUser(
      client,
      req.body?.assignedToUserId ?? req.body?.assignedTo,
      actorRole,
      req.authUser!.userId,
    );
    if (!assignee) {
      await client.query("ROLLBACK");
      res.status(400).json({
        error: actorRole === "EMPLOYEE"
          ? "Select an active intern assigned to you."
          : "Select an active employee for Assign To.",
      });
      return;
    }

    const created = await client.query<DbRow>(`
      INSERT INTO tasks (
        project_id, sprint_id, title, description, status, priority,
        assigned_to, created_by, updated_by, due_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9)
      RETURNING id
    `, [
      projectId,
      sprintId,
      title,
      description,
      status,
      priority,
      asString(assignee.user_id),
      req.authUser!.userId,
      dueAt,
    ]);

    const taskRow = await loadTask(client, Number(created.rows[0]?.id));
    if (!taskRow) throw new Error("Created task could not be loaded.");

    const notification = await insertNotification(
      client,
      asString(assignee.user_id),
      taskRow,
      req.authUser!.fullName,
    );

    await client.query("COMMIT");

    const task = mapTask(taskRow);
    emitToAll("task_created", task);
    emitToAll("task_updated", task);
    if (notification) {
      emitToUser(asString(assignee.user_id), "notification_created", notification);
    }

    res.status(201).json({ task });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    req.log?.error({ err: error }, "Task creation failed");
    res.status(503).json({ error: "Unable to create task." });
  } finally {
    client.release();
  }
});

router.patch("/tasks/:id", requireAuth, async (req, res): Promise<void> => {
  const actorRole = req.authUser!.role;
  const requestBody = (req.body ?? {}) as Record<string, unknown>;
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "A valid task id is required." });
    return;
  }

  const current = await loadTask(pool, id);
  if (!current) {
    res.status(404).json({ error: "Task not found." });
    return;
  }

  const isAdmin = actorRole === "ADMIN";
  const isAssignedUser = asString(current.assigned_to) === req.authUser!.userId;
  const isCreator = asString(current.created_by) === req.authUser!.userId;
  if (!isAdmin && hasAdminOnlyPatchFields(requestBody)) {
    res.status(403).json({ error: "Only admins can use task management actions." });
    return;
  }
  if (!isAdmin && !isAssignedUser && !isCreator) {
    res.status(403).json({ error: "You can update only tasks assigned to you or created by you." });
    return;
  }

  const nextTitle = req.body?.title === undefined ? asString(current.title) : asString(req.body.title).trim();
  if (!nextTitle) {
    res.status(400).json({ error: "Task title is required." });
    return;
  }

  const nextDescription = req.body?.description === undefined ? asString(current.description) : asString(req.body.description);
  const nextPriority = req.body?.priority === undefined ? asString(current.priority, "Medium") : normalizePriority(req.body.priority);
  const nextStatus = req.body?.status === undefined && req.body?.column === undefined
    ? asString(current.status, "To Do")
    : normalizeStatus(req.body?.status ?? req.body?.column);
  const nextDueAt = req.body?.dueDate === undefined && req.body?.dueAt === undefined
    ? current.due_at ?? null
    : normalizeDueAt(req.body?.dueDate ?? req.body?.dueAt);
  const nextProjectId = req.body?.projectId === undefined
    ? current.project_id ?? null
    : normalizeOptionalNumber(req.body.projectId);
  const nextSprintId = req.body?.sprintId === undefined
    ? current.sprint_id ?? null
    : normalizeOptionalNumber(req.body.sprintId);
  let nextAssignee = asString(current.assigned_to);

  if (req.body?.assignedTo !== undefined || req.body?.assignedToUserId !== undefined) {
    const assignee = await findAssignableUser(
      pool,
      req.body?.assignedToUserId ?? req.body?.assignedTo,
      actorRole,
      req.authUser!.userId,
    );
    if (!assignee) {
      res.status(400).json({
        error: actorRole === "EMPLOYEE"
          ? "Select an active intern assigned to you."
          : "Select an active employee for Assign To.",
      });
      return;
    }
    nextAssignee = asString(assignee.user_id);
  }

  try {
    await pool.query(`
      UPDATE tasks
      SET title = $2,
          description = $3,
          status = $4,
          priority = $5,
          assigned_to = $6,
          due_at = $7,
          updated_by = $8,
          updated_at = NOW(),
          project_id = $9,
          sprint_id = $10
      WHERE id = $1
    `, [
      id,
      nextTitle,
      nextDescription,
      nextStatus,
      nextPriority,
      nextAssignee || null,
      nextDueAt,
      req.authUser!.userId,
      nextProjectId,
      nextSprintId,
    ]);

    const updated = await loadTask(pool, id);
    const task = updated ? mapTask(updated) : null;
    const assignmentChanged = Boolean(nextAssignee) && nextAssignee !== asString(current.assigned_to)
      && (req.body?.assignedTo !== undefined || req.body?.assignedToUserId !== undefined);
    const projectChanged = req.body?.projectId !== undefined &&
      asString(current.project_id) !== asString(updated?.project_id);
    const assignmentNotificationRequested = isAdmin && req.body?.notifyAssignment === true;
    const notification = (assignmentChanged || assignmentNotificationRequested) && updated && nextAssignee && !projectChanged
      ? await insertNotification(pool, nextAssignee, updated, req.authUser!.fullName)
      : null;
    const projectNotification = projectChanged && updated && nextAssignee
      ? await insertProjectMoveNotification(
          pool,
          nextAssignee,
          updated,
          asString(current.project_name),
          asString(updated.project_name),
          req.authUser!.fullName,
        )
      : null;

    emitToAll("task_updated", task);
    if (notification) {
      emitToUser(nextAssignee, "notification_created", notification);
    }
    if (projectNotification) {
      emitToUser(nextAssignee, "notification_created", projectNotification);
    }
    res.json({ task });
  } catch (error) {
    req.log?.error({ err: error }, "Task update failed");
    res.status(503).json({ error: "Unable to update task." });
  }
});

export default router;
