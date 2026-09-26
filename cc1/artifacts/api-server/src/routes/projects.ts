import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { emitToUser, emitToUsers } from "../lib/realtime";

const router: IRouter = Router();

type DbRow = Record<string, unknown>;

function asString(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asDateString(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

async function findEmployeeUserId(employeeIdentifier: string): Promise<{ userId: string; employeeCode: string; fullName: string } | null> {
  const trimmed = employeeIdentifier.trim();
  if (!trimmed) return null;

  const result = await pool.query<DbRow>(`
    SELECT e.employee_code, e.user_id, u.full_name
    FROM employees e
    JOIN users u ON u.user_id = e.user_id
    WHERE e.employee_code = $1 OR e.user_id = $1 OR UPPER(u.user_id) = UPPER($1)
    LIMIT 1
  `, [trimmed]);

  if (result.rows[0]) {
    return {
      userId: asString(result.rows[0].user_id),
      employeeCode: asString(result.rows[0].employee_code),
      fullName: asString(result.rows[0].full_name),
    };
  }

  // Also fallback to users table directly if user is employee role
  const userResult = await pool.query<DbRow>(`
    SELECT user_id, full_name, role
    FROM users
    WHERE (user_id = $1 OR UPPER(user_id) = UPPER($1))
      AND role IN ('EMPLOYEE', 'ADMIN', 'HR', 'MANAGER')
    LIMIT 1
  `, [trimmed]);

  if (userResult.rows[0]) {
    return {
      userId: asString(userResult.rows[0].user_id),
      employeeCode: asString(userResult.rows[0].user_id),
      fullName: asString(userResult.rows[0].full_name),
    };
  }

  return null;
}

async function getProjectById(projectId: number) {
  const projectResult = await pool.query<DbRow>(`
    SELECT id, name, description, status, category, image_color, start_date, end_date,
           created_by, created_at, updated_at
    FROM projects
    WHERE id = $1
  `, [projectId]);

  const row = projectResult.rows[0];
  if (!row) return null;

  const membersResult = await pool.query<DbRow>(`
    SELECT pm.user_id, pm.member_role,
           e.employee_code, t.trainee_code
    FROM project_members pm
    LEFT JOIN employees e ON e.user_id = pm.user_id
    LEFT JOIN trainees t ON t.user_id = pm.user_id
    WHERE pm.project_id = $1
  `, [projectId]);

  const assignedStaff = membersResult.rows
    .map((m) => asString(m.employee_code) || asString(m.user_id))
    .filter(Boolean);

  const assignedInterns = membersResult.rows
    .map((m) => asString(m.trainee_code))
    .filter(Boolean);

  return {
    id: String(row.id),
    name: asString(row.name),
    description: asString(row.description),
    category: asString(row.category, "Web Application"),
    createdBy: asString(row.created_by),
    startDate: asDateString(row.start_date) || asDateString(row.created_at),
    endDate: asDateString(row.end_date),
    status: asString(row.status, "Planning"),
    imageColor: asString(row.image_color, "from-blue-500 to-indigo-600"),
    assignedStaff,
    assignedInterns,
  };
}

// GET /projects: Role-filtered project list
router.get("/projects", requireAuth, async (req, res): Promise<void> => {
  try {
    const userRole = req.authUser!.role;
    const currentUserId = req.authUser!.userId;

    let query = `
      SELECT p.id, p.name, p.description, p.status, p.category, p.image_color,
             p.start_date, p.end_date, p.created_by, p.created_at, p.updated_at
      FROM projects p
    `;
    const params: unknown[] = [];

    if (userRole !== "ADMIN" && userRole !== "HR" && userRole !== "MANAGER") {
      // Employees and interns only see projects they are assigned to
      query += `
        JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
      `;
      params.push(currentUserId);
    }

    query += ` ORDER BY p.id DESC`;

    const result = await pool.query<DbRow>(query, params);
    const projects = await Promise.all(result.rows.map((row) => getProjectById(asNumber(row.id))));

    res.json({ projects: projects.filter(Boolean) });
  } catch (error) {
    req.log?.error({ err: error }, "Projects lookup failed");
    res.status(503).json({ error: "Unable to load projects." });
  }
});

// POST /projects: ONLY ADMIN CAN CREATE PROJECTS
// Backend enforces requireRole(["ADMIN"])
router.post("/projects", requireAuth, requireRole(["ADMIN"]), async (req, res): Promise<void> => {
  const name = asString(req.body?.name).trim();
  const description = asString(req.body?.description).trim();
  const category = asString(req.body?.category, "Web Application").trim();
  const status = asString(req.body?.status, "Planning").trim();
  const startDate = asString(req.body?.startDate).trim() || null;
  const endDate = asString(req.body?.endDate).trim() || null;
  const imageColor = asString(req.body?.imageColor, "from-blue-500 to-indigo-600").trim();

  // Employee assignment field
  const assignedEmployee = asString(req.body?.assignedEmployeeId ?? req.body?.assignedTo ?? req.body?.employeeId).trim();
  const assignedStaffInput = Array.isArray(req.body?.assignedStaff) ? req.body.assignedStaff : [];
  const allAssignees = [...new Set([assignedEmployee, ...assignedStaffInput].map(String).map((s) => s.trim()).filter(Boolean))];

  if (!name) {
    res.status(400).json({ error: "Project name is required." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const insertResult = await client.query<DbRow>(`
      INSERT INTO projects (name, description, category, status, image_color, start_date, end_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [name, description, category, status, imageColor, startDate, endDate, req.authUser!.userId]);

    const newProjectId = asNumber(insertResult.rows[0].id);

    const assignedUsers: Array<{ userId: string; employeeCode: string; fullName: string }> = [];

    for (const assignee of allAssignees) {
      const emp = await findEmployeeUserId(assignee);
      if (emp) {
        await client.query(`
          INSERT INTO project_members (project_id, user_id, member_role)
          VALUES ($1, $2, 'EMPLOYEE')
          ON CONFLICT (project_id, user_id) DO NOTHING
        `, [newProjectId, emp.userId]);
        assignedUsers.push(emp);
      }
    }

    // A8. PROJECT ASSIGNMENT NOTIFICATION
    // When Admin assigns a project to Employee A, send a notification using the existing notification system
    const adminName = req.authUser!.fullName || "Admin User";
    const notificationTitle = "New Project Assigned";
    const notificationMessage = `${adminName} assigned you to:\n\n${name}`;

    const createdNotifications: DbRow[] = [];
    for (const emp of assignedUsers) {
      const notifResult = await client.query<DbRow>(`
        INSERT INTO notifications (user_id, title, message, category)
        VALUES ($1, $2, $3, 'Project')
        RETURNING id, user_id, title, message, category, read_at, created_at
      `, [emp.userId, notificationTitle, notificationMessage]);

      if (notifResult.rows[0]) {
        createdNotifications.push(notifResult.rows[0]);
      }
    }

    await client.query("COMMIT");

    const formattedProject = await getProjectById(newProjectId);

    // Live delivery via existing SSE mechanism (A7)
    for (const notif of createdNotifications) {
      emitToUser(asString(notif.user_id), "notification_created", notif);
      emitToUser(asString(notif.user_id), "project_assigned", { project: formattedProject });
    }

    // Also notify admins
    const adminUsersResult = await pool.query<{ user_id: string }>(
      "SELECT user_id FROM users WHERE role = 'ADMIN' AND status = 'Active'",
    );
    const adminUserIds = adminUsersResult.rows.map((r) => r.user_id);
    emitToUsers(adminUserIds, "project_created", { project: formattedProject });

    res.status(201).json({ project: formattedProject, notifications: createdNotifications });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    req.log?.error({ err: error }, "Project creation failed");
    res.status(500).json({ error: "Unable to create project." });
  } finally {
    client.release();
  }
});

export default router;
