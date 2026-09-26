import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

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

function notificationTaskId(notification: DbRow) {
  if (asString(notification.category).toLowerCase() !== "task") return undefined;
  const match = asString(notification.message).match(/\bTask ID\s+(\d+)\b/i);
  return match?.[1];
}

function percent(completed: number, total: number) {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

function displayRole(role: unknown) {
  const normalized = asString(role).toUpperCase();
  if (normalized === "TRAINEE") return "INTERN";
  return ["ADMIN", "EMPLOYEE", "INTERN", "HR", "MANAGER"].includes(normalized) ? normalized : "EMPLOYEE";
}

function managerMatchesEmployee(manager: unknown, employee: DbRow) {
  const normalizedManager = asString(manager).trim().toLowerCase();
  if (!normalizedManager || normalizedManager === "—" || normalizedManager === "-") return false;

  return [
    asString(employee.full_name),
    asString(employee.employee_code),
    asString(employee.user_id),
  ].some((value) => value.trim().toLowerCase() === normalizedManager);
}

async function rows(query: string, params: unknown[] = []) {
  const result = await pool.query<DbRow>(query, params);
  return result.rows;
}

router.get("/app-data", requireAuth, async (req, res): Promise<void> => {
  try {
    const canSeeAllProjects = ["ADMIN", "HR", "MANAGER"].includes(req.authUser!.role);
    const projectVisibilityJoin = canSeeAllProjects ? "" : "JOIN project_members assigned_project ON assigned_project.project_id = p.id AND assigned_project.user_id = $1";
    const projectVisibilityParams = canSeeAllProjects ? [] : [req.authUser!.userId];
    const [
      employees,
      trainees,
      projects,
      projectMembers,
      tasks,
      leaveRequests,
      notifications,
      events,
      projectDocuments,
    ] = await Promise.all([
      rows(`
        SELECT e.employee_code, e.user_id, e.designation, e.phone, e.bio, e.status, e.created_at,
               u.full_name, u.email, u.role, u.avatar_url, d.name AS department_name
        FROM employees e
        JOIN users u ON u.user_id = e.user_id
        LEFT JOIN departments d ON d.id = e.department_id
        ORDER BY e.employee_code
      `),
      rows(`
        SELECT t.trainee_code, t.user_id, t.college, t.degree, t.phone, t.project_name, t.manager,
               t.start_date, t.end_date, t.cgpa, t.year, t.gender, t.dob, t.address,
               t.status, t.created_at,
               u.full_name, u.email, u.avatar_url, d.name AS department_name
        FROM trainees t
        JOIN users u ON u.user_id = t.user_id
        LEFT JOIN departments d ON d.id = t.department_id
        ORDER BY t.trainee_code
      `),
      rows(`
        SELECT id, name, description, status, created_by, created_at, updated_at
        FROM projects
        ${projectVisibilityJoin}
        ORDER BY id
      `, projectVisibilityParams),
      rows(`
        SELECT pm.project_id, pm.user_id, pm.member_role, u.role
        FROM project_members pm
        JOIN users u ON u.user_id = pm.user_id
      `),
      rows(`
        SELECT t.id, t.project_id, t.sprint_id, t.title, t.description, t.status, t.priority,
               t.due_at, t.assigned_to, t.created_by,
               u.full_name AS assigned_name, p.name AS project_name
        FROM tasks t
        LEFT JOIN users u ON u.user_id = t.assigned_to
        LEFT JOIN projects p ON p.id = t.project_id
        ORDER BY t.id
      `),
      rows(`
        SELECT lr.id, lr.user_id, lr.leave_type, lr.start_date, lr.end_date, lr.start_time, lr.end_time,
               lr.reason, lr.status, lr.duration, lr.leave_days, lr.decided_by, lr.decision_reason,
               lr.decided_at, lr.created_at, lr.half_day, lr.half_day_period,
               u.full_name, u.email, u.role::text AS role, u.avatar_url,
               e.employee_code, t.trainee_code
        FROM leave_requests lr
        JOIN users u ON u.user_id = lr.user_id
        LEFT JOIN employees e ON e.user_id = lr.user_id
        LEFT JOIN trainees t ON t.user_id = lr.user_id
        ORDER BY lr.id
      `),
      rows(`
        SELECT id, category, title, message, read_at, created_at
        FROM notifications
        WHERE user_id IS NULL OR user_id = $1
        ORDER BY created_at DESC, id DESC
      `, [req.authUser!.userId]),
      rows(`
        SELECT id, title, event_type, starts_at
        FROM events
        ORDER BY starts_at
      `),
      rows(`
        SELECT d.id, d.project_id, d.title, d.file_name, d.file_type, d.file_size, d.created_at,
               u.name AS uploaded_by_name
        FROM dms_documents d
        LEFT JOIN dms_users u ON u.id = d.uploaded_by
        ORDER BY d.id
      `),
    ]);

    const employeeIdByUser = new Map(employees.map((employee) => [
      asString(employee.user_id),
      asString(employee.employee_code),
    ]));
    const traineeIdByUser = new Map(trainees.map((trainee) => [
      asString(trainee.user_id),
      asString(trainee.trainee_code),
    ]));
    const traineeNameByUser = new Map(trainees.map((trainee) => [
      asString(trainee.user_id),
      asString(trainee.full_name),
    ]));

    const tasksByAssignee = new Map<string, DbRow[]>();
    for (const task of tasks) {
      const assignedTo = asString(task.assigned_to);
      if (!assignedTo) continue;
      tasksByAssignee.set(assignedTo, [...(tasksByAssignee.get(assignedTo) ?? []), task]);
    }

    const projectNameById = new Map(projects.map((project) => [
      asNumber(project.id),
      asString(project.name),
    ]));

    const projectMembersByProject = new Map<number, DbRow[]>();
    for (const member of projectMembers) {
      const projectId = asNumber(member.project_id);
      projectMembersByProject.set(projectId, [...(projectMembersByProject.get(projectId) ?? []), member]);
    }

    const frontendProjects = projects.map((project) => {
      const members = projectMembersByProject.get(asNumber(project.id)) ?? [];
      return {
        id: String(project.id),
        name: asString(project.name),
        description: asString(project.description),
        category: "Web Application",
        createdBy: asString(project.created_by),
        startDate: asDateString(project.created_at),
        endDate: "",
        status: asString(project.status, "Planning"),
        imageColor: "from-blue-500 to-indigo-600",
        assignedStaff: members
          .map((member) => employeeIdByUser.get(asString(member.user_id)))
          .filter(Boolean),
        assignedInterns: members
          .map((member) => traineeIdByUser.get(asString(member.user_id)))
          .filter(Boolean),
      };
    });

    const frontendStudents = trainees.map((trainee) => {
      const traineeTasks = tasksByAssignee.get(asString(trainee.user_id)) ?? [];
      const completedTasks = traineeTasks.filter((task) => asString(task.status).toLowerCase() === "completed").length;
      const progress = percent(completedTasks, traineeTasks.length);
      const firstProject = frontendProjects.find((project) => project.assignedInterns.includes(asString(trainee.trainee_code)));

      return {
        id: asString(trainee.trainee_code),
        userId: asString(trainee.user_id),
        name: asString(trainee.full_name),
        college: asString(trainee.college),
        role: "Intern",
        project: asString(trainee.project_name) || firstProject?.name || "",
        email: asString(trainee.email),
        avatarUrl: asString(trainee.avatar_url),
        phone: asString(trainee.phone),
        startDate: asDateString(trainee.start_date) || asDateString(trainee.created_at),
        endDate: asDateString(trainee.end_date),
        manager: asString(trainee.manager),
        progress,
        status: asString(trainee.status, "Active"),
        cgpa: asNumber(trainee.cgpa),
        dob: asDateString(trainee.dob),
        gender: asString(trainee.gender),
        address: asString(trainee.address),
        degree: asString(trainee.degree),
        year: asString(trainee.year),
        skills: [],
      };
    });

    const frontendStaff = employees.map((employee) => {
      const employeeCode = asString(employee.employee_code);
      const projectAssignedInterns = frontendProjects
        .filter((project) => project.assignedStaff.includes(employeeCode))
        .flatMap((project) => project.assignedInterns);
      const managerAssignedInterns = trainees
        .filter((trainee) => managerMatchesEmployee(trainee.manager, employee))
        .map((trainee) => asString(trainee.trainee_code))
        .filter(Boolean);

      return {
        id: employeeCode,
        name: asString(employee.full_name),
        designation: asString(employee.designation),
        role: displayRole(employee.role),
      userId: asString(employee.user_id),
        assignedInterns: [...new Set([...managerAssignedInterns, ...projectAssignedInterns])],
        email: asString(employee.email),
        avatarUrl: asString(employee.avatar_url),
        phone: asString(employee.phone),
        status: asString(employee.status, "Active"),
        bio: asString(employee.bio) || asString(employee.department_name),
      };
    });

    const frontendTasks = tasks.map((task) => ({
      id: String(task.id),
      title: asString(task.title),
      description: asString(task.description),
      assignedTo: asString(task.assigned_name),
      assignedToUserId: asString(task.assigned_to),
      createdByUserId: asString(task.created_by),
      projectId: asString(task.project_id),
      projectName: asString(task.project_name),
      priority: asString(task.priority, "Medium"),
      dueDate: asDateString(task.due_at),
      status: asString(task.status, "To Do"),
      attachments: 0,
    }));

    const frontendLeaveRequests = leaveRequests.map((leave) => {
      const rawDuration = leave.leave_days ?? leave.duration;
      const numericDuration = Number(rawDuration);
      const startDate = new Date(asString(leave.start_date));
      const endDate = new Date(asString(leave.end_date));
      const fallbackDuration = Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())
        ? 0
        : Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1);
      const duration = Number.isFinite(numericDuration) && numericDuration > 0 ? numericDuration : fallbackDuration;

      return {
        id: String(leave.id),
        userId: asString(leave.user_id),
        applicantId: asString(leave.employee_code) || asString(leave.trainee_code) || asString(leave.user_id),
        applicantRole: asString(leave.role, "EMPLOYEE"),
        internName: asString(leave.full_name),
        employeeName: asString(leave.full_name),
        employeeId: asString(leave.employee_code) || asString(leave.trainee_code) || asString(leave.user_id),
        email: asString(leave.email),
        avatarUrl: asString(leave.avatar_url),
        type: asString(leave.leave_type),
        startDate: asDateString(leave.start_date),
        endDate: asDateString(leave.end_date),
        reason: asString(leave.reason),
        status: asString(leave.status, "Pending"),
        duration,
        halfDay: Boolean(leave.half_day),
        halfDayPeriod: asString(leave.half_day_period),
        submittedAt: leave.created_at instanceof Date ? leave.created_at.toISOString() : asString(leave.created_at),
        decidedBy: asString(leave.decided_by),
        decidedAt: leave.decided_at instanceof Date ? leave.decided_at.toISOString() : asString(leave.decided_at),
        rejectionReason: asString(leave.decision_reason),
      };
    });

    const frontendPerformanceData = trainees.map((trainee) => {
      const traineeTasks = tasksByAssignee.get(asString(trainee.user_id)) ?? [];
      const completedTasks = traineeTasks.filter((task) => asString(task.status).toLowerCase() === "completed").length;
      const taskCompletion = percent(completedTasks, traineeTasks.length);

      return {
        internId: asString(trainee.trainee_code),
        attendance: 0,
        taskCompletion,
        communication: 0,
        discipline: 0,
        learning: 0,
        innovation: 0,
        leadership: 0,
        collaboration: 0,
      };
    });

    res.json({
      students: frontendStudents,
      staff: frontendStaff,
      leaveRequests: frontendLeaveRequests,
      tasks: frontendTasks,
      shifts: [],
      performanceData: frontendPerformanceData,
      notifications: notifications.map((notification) => ({
        id: String(notification.id),
        category: asString(notification.category),
        title: asString(notification.title),
        message: asString(notification.message),
        time: asDateString(notification.created_at),
        read: Boolean(notification.read_at),
        taskId: notificationTaskId(notification),
      })),
      projects: frontendProjects,
      projectDocuments: projectDocuments.map((document) => ({
        id: String(document.id),
        projectId: String(document.project_id),
        title: asString(document.title),
        fileName: asString(document.file_name),
        fileType: asString(document.file_type),
        uploadedBy: asString(document.uploaded_by_name),
        uploadDate: asDateString(document.created_at),
        sizeMB: Math.round((asNumber(document.file_size) / 1024 / 1024) * 10) / 10,
      })),
      events: events.map((event) => ({
        date: asDateString(event.starts_at),
        title: asString(event.title),
        type: asString(event.event_type, "Event"),
      })),
    });
  } catch (error) {
    req.log?.error({ err: error }, "Application data lookup failed");
    res.status(503).json({ error: "Unable to load application data from the database." });
  }
});

export default router;
