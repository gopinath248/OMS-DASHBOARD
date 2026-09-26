import { randomBytes } from "node:crypto";
import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { pool, type UserRole } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

const ADMIN_ONLY: UserRole[] = ["ADMIN"];
const INTERN_CREATORS: UserRole[] = ["ADMIN", "EMPLOYEE", "HR", "MANAGER"];
const PROJECT_MANAGERS: UserRole[] = ["ADMIN", "HR", "MANAGER"];

type DbRow = Record<string, unknown>;

type CreateEmployeeBody = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  designation?: unknown;
  role?: unknown;
  bio?: unknown;
  status?: unknown;
  salary?: unknown;
  temporaryPassword?: unknown;
};

type CreateInternBody = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  college?: unknown;
  role?: unknown;
  project?: unknown;
  manager?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  cgpa?: unknown;
  degree?: unknown;
  year?: unknown;
  gender?: unknown;
  dob?: unknown;
  address?: unknown;
  status?: unknown;
  salary?: unknown;
  temporaryPassword?: unknown;
};

type UpdateEmployeeBody = CreateEmployeeBody;
type UpdateInternBody = CreateInternBody;

type AssignInternBody = {
  internId?: unknown;
  intern_id?: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

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

function optionalText(value: unknown) {
  const parsed = text(value);
  return parsed === "" ? null : parsed;
}

function hasInvalidPhone(value: unknown) {
  if (value === undefined || value === null) return false;
  if (typeof value !== "string") return true;

  const phone = value.trim();
  return phone !== "" && !/^\d{10}$/.test(phone);
}

function optionalDate(value: unknown) {
  const parsed = text(value);
  if (!parsed) return null;

  const timestamp = Date.parse(parsed);
  return Number.isNaN(timestamp) ? null : parsed;
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asPositiveNumber(value: unknown, fallback: number | null = null) {
  if (value === null || value === undefined || value === "") return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(2)) : fallback;
}

function hasOwnField(body: object, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function emailFor(name: string, email: unknown) {
  const parsed = text(email).toLowerCase();
  if (parsed) return parsed;

  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "")}@cc.local`;
}

function normalizeRole(role: unknown): UserRole | null {
  const parsed = text(role).toUpperCase();
  switch (parsed) {
    case "ADMIN":
      return "ADMIN";
    case "EMPLOYEE":
      return "EMPLOYEE";
    case "HR":
      return "HR";
    case "MANAGER":
      return "MANAGER";
    case "INTERN":
    case "STUDENT":
    case "TRAINEE":
      return "INTERN";
    default:
      return null;
  }
}

function normalizeStatus(status: unknown) {
  const parsed = text(status);
  return parsed || "Active";
}

function authStatus(status: string) {
  return status.toLowerCase() === "inactive" ? "Inactive" : "Active";
}

function displayRole(role: UserRole) {
  return role;
}

function generateTemporaryPassword() {
  return `Cc1!${randomBytes(15).toString("base64url")}`;
}

function passwordFromBody(value: unknown) {
  const parsed = text(value);
  return parsed || generateTemporaryPassword();
}

function userIdFor(name: string, code: string, source: "first" | "last") {
  const parts = name.split(/\s+/).filter(Boolean);
  const namePart = source === "last" ? parts.at(-1) : parts[0];
  const safeName = (namePart || "USER").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return `${safeName}CC${code.slice(-3)}`;
}

async function nextCode(client: { query: typeof pool.query }, table: "employees" | "trainees", column: "employee_code" | "trainee_code", prefix: "EMP" | "INT") {
  const result = await client.query<{ code: string }>(
    `SELECT ${column} AS code
     FROM ${table}
     WHERE ${column} ~ $1
     ORDER BY substring(${column} from 4)::int DESC
     LIMIT 1`,
    [`^${prefix}[0-9]+$`],
  );
  const latest = result.rows[0]?.code;
  const next = latest ? Number(latest.slice(3)) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

function assertRequired(value: string, label: string, errors: string[]) {
  if (!value) errors.push(`${label} is required.`);
}

async function rows(query: string, params: unknown[] = []) {
  const result = await pool.query<DbRow>(query, params);
  return result.rows;
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

async function readEmployees() {
  const [employees, trainees, projectMembers] = await Promise.all([
    rows(`
      SELECT e.employee_code, e.user_id, e.designation, e.phone, e.bio, e.status,
             u.full_name, u.email, u.role, u.avatar_url, COALESCE(p.monthly_salary, 0) AS monthly_salary
      FROM employees e
      JOIN users u ON u.user_id = e.user_id
      LEFT JOIN employee_salary_profiles p ON p.employee_id = e.employee_code AND p.employee_source = 'employees'
      ORDER BY e.employee_code
    `),
    rows(`
      SELECT trainee_code, user_id, manager, COALESCE(p.monthly_salary, 0) AS monthly_salary
      FROM trainees
      LEFT JOIN employee_salary_profiles p ON p.employee_id = trainees.trainee_code AND p.employee_source = 'trainees'
      ORDER BY trainee_code
    `),
    rows(`
      SELECT pm.project_id, pm.user_id
      FROM project_members pm
      ORDER BY pm.project_id, pm.user_id
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
  const usersByProject = new Map<number, string[]>();
  for (const member of projectMembers) {
    const projectId = asNumber(member.project_id);
    usersByProject.set(projectId, [...(usersByProject.get(projectId) ?? []), asString(member.user_id)]);
  }

  return employees.map((employee) => {
    const employeeCode = asString(employee.employee_code);
    const projectAssignedInterns = [...usersByProject.values()]
      .filter((userIds) => userIds.some((userId) => employeeIdByUser.get(userId) === employeeCode))
      .flatMap((userIds) => userIds.map((userId) => traineeIdByUser.get(userId)).filter(Boolean));
    const managerAssignedInterns = trainees
      .filter((trainee) => managerMatchesEmployee(trainee.manager, employee))
      .map((trainee) => asString(trainee.trainee_code))
      .filter(Boolean);

    return {
      id: employeeCode,
      userId: asString(employee.user_id),
      name: asString(employee.full_name),
      designation: asString(employee.designation),
      role: displayRole(normalizeRole(employee.role) ?? "EMPLOYEE"),
      assignedInterns: [...new Set([...managerAssignedInterns, ...projectAssignedInterns])],
      email: asString(employee.email),
      avatarUrl: asString(employee.avatar_url),
      phone: asString(employee.phone),
      status: asString(employee.status, "Active"),
      bio: asString(employee.bio),
      salary: asNumber(employee.monthly_salary, 0),
    };
  });
}

async function readTrainees() {
  const trainees = await rows(`
    SELECT t.trainee_code, t.user_id, t.college, t.degree, t.phone, t.project_name, t.manager,
           t.start_date, t.end_date, t.cgpa, t.year, t.gender, t.dob, t.address,
           t.status, t.created_at, u.full_name, u.email, u.avatar_url,
           COALESCE(p.monthly_salary, 0) AS monthly_salary
    FROM trainees t
    JOIN users u ON u.user_id = t.user_id
    LEFT JOIN employee_salary_profiles p ON p.employee_id = t.trainee_code AND p.employee_source = 'trainees'
    ORDER BY t.trainee_code
  `);

  return trainees.map((trainee) => ({
    id: asString(trainee.trainee_code),
    userId: asString(trainee.user_id),
    name: asString(trainee.full_name),
    college: asString(trainee.college),
    role: "Intern",
    project: asString(trainee.project_name),
    email: asString(trainee.email),
    avatarUrl: asString(trainee.avatar_url),
    phone: asString(trainee.phone),
    startDate: asDateString(trainee.start_date) || asDateString(trainee.created_at),
    endDate: asDateString(trainee.end_date),
    manager: asString(trainee.manager),
    progress: 0,
    status: asString(trainee.status, "Active"),
    cgpa: asNumber(trainee.cgpa),
    dob: asDateString(trainee.dob),
    gender: asString(trainee.gender),
    address: asString(trainee.address),
    degree: asString(trainee.degree),
    year: asString(trainee.year),
    skills: [],
    salary: asNumber(trainee.monthly_salary, 0),
  }));
}

async function upsertSalaryProfile(client: { query: typeof pool.query }, employeeId: string, employeeSource: "employees" | "trainees", monthlySalary: number) {
  await client.query(
    `INSERT INTO employee_salary_profiles (employee_id, employee_source, monthly_salary)
     VALUES ($1, $2, $3)
     ON CONFLICT (employee_id) DO UPDATE SET
       employee_source = EXCLUDED.employee_source,
       monthly_salary = EXCLUDED.monthly_salary,
       updated_at = NOW()`,
    [employeeId, employeeSource, monthlySalary],
  );
}

router.get("/employees", requireAuth, async (req, res): Promise<void> => {
  try {
    res.json({ employees: await readEmployees() });
  } catch (error) {
    req.log?.error({ err: error }, "Employee list lookup failed");
    res.status(503).json({ error: "Unable to load employees from the database." });
  }
});

router.post("/employees", requireAuth, requireRole(ADMIN_ONLY), async (req, res): Promise<void> => {
  const body = req.body as CreateEmployeeBody;
  const fullName = text(body.name);
  const designation = text(body.designation);
  const role = normalizeRole(body.role);
  const status = normalizeStatus(body.status);
  const email = emailFor(fullName, body.email);
  const phone = optionalText(body.phone);
  const bio = optionalText(body.bio);
  const monthlySalary = asPositiveNumber(body.salary);
  const temporaryPassword = text(body.temporaryPassword);

  const errors: string[] = [];
  assertRequired(fullName, "Name", errors);
  assertRequired(designation, "Designation", errors);
  assertRequired(temporaryPassword, "Temporary password", errors);
  if (!role) errors.push("Role must be ADMIN, EMPLOYEE, INTERN, HR, or MANAGER.");
  if (monthlySalary === null) errors.push("Salary must be a valid non-negative number.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("A valid email is required.");
  if (hasInvalidPhone(body.phone)) errors.push("Please enter a valid 10-digit phone number.");
  if (temporaryPassword && temporaryPassword.length < 8) errors.push("Temporary password must be at least 8 characters.");

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join(" ") });
    return;
  }
  const employeeRole = role;
  if (!employeeRole) {
    res.status(400).json({ error: "Role must be ADMIN, EMPLOYEE, INTERN, HR, or MANAGER." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const employeeCode = await nextCode(client, "employees", "employee_code", "EMP");
    const userId = userIdFor(fullName, employeeCode, "last");
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const duplicateUser = await client.query("SELECT 1 FROM users WHERE user_id = $1 OR lower(email) = lower($2) LIMIT 1", [userId, email]);
    if (duplicateUser.rowCount) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "A user with this User ID or email already exists." });
      return;
    }

    const duplicateEmployee = await client.query("SELECT 1 FROM employees WHERE employee_code = $1 LIMIT 1", [employeeCode]);
    if (duplicateEmployee.rowCount) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "An employee with this Employee ID already exists." });
      return;
    }

    await client.query(
      `INSERT INTO users (user_id, password_hash, full_name, email, role, status)
       VALUES ($1, $2, $3, $4, $5::user_role, $6::user_status)`,
      [userId, passwordHash, fullName, email, employeeRole, authStatus(status)],
    );

    await client.query(
      `INSERT INTO employees (user_id, employee_code, designation, phone, bio, status, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
      [userId, employeeCode, designation, phone, bio, status, req.authUser!.userId],
    );

    await upsertSalaryProfile(client, employeeCode, "employees", monthlySalary ?? 0);

    await client.query("COMMIT");

    res.status(201).json({
      employee: {
        id: employeeCode,
        userId,
        name: fullName,
        email,
        avatarUrl: null,
        phone: phone ?? "",
        designation,
        role: displayRole(employeeRole),
        bio: bio ?? "",
        salary: monthlySalary ?? 0,
        status,
        assignedInterns: [],
      },
      temporaryPassword,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    req.log?.error({ err: error }, "Employee creation failed");
    res.status(500).json({ error: "Unable to create employee." });
  } finally {
    client.release();
  }
});

router.delete("/employees/:id", requireAuth, requireRole(ADMIN_ONLY), async (req, res): Promise<void> => {
  const employeeCode = text(req.params.id);
  if (!employeeCode) {
    res.status(400).json({ error: "Employee ID is required." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const employee = await client.query<{ user_id: string; full_name: string }>(
      `SELECT e.user_id, u.full_name
       FROM employees e
       JOIN users u ON u.user_id = e.user_id
       WHERE e.employee_code = $1
       FOR UPDATE`,
      [employeeCode],
    );

    const row = employee.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Employee not found." });
      return;
    }

    await client.query("DELETE FROM users WHERE user_id = $1", [row.user_id]);
    await client.query("COMMIT");

    res.json({ ok: true, employeeId: employeeCode, userId: row.user_id, name: row.full_name });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    req.log?.error({ err: error }, "Employee deletion failed");
    res.status(500).json({ error: "Unable to delete employee." });
  } finally {
    client.release();
  }
});

router.post("/employees/:id/assign-intern", requireAuth, requireRole(ADMIN_ONLY), async (req, res): Promise<void> => {
  const employeeCode = text(req.params.id);
  const body = req.body as AssignInternBody;
  const traineeCode = text(body.internId ?? body.intern_id);

  if (!employeeCode || !traineeCode) {
    res.status(400).json({ error: "Employee ID and intern ID are required." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const employee = await client.query<DbRow>(
      `SELECT e.employee_code, e.user_id, e.status, u.full_name
       FROM employees e
       JOIN users u ON u.user_id = e.user_id
       WHERE e.employee_code = $1
       FOR UPDATE`,
      [employeeCode],
    );
    const employeeRow = employee.rows[0];
    if (!employeeRow) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Employee not found." });
      return;
    }

    if (asString(employeeRow.status, "Active").toLowerCase() !== "active") {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Only active employees can be assigned interns." });
      return;
    }

    const trainee = await client.query<DbRow>(
      `SELECT t.trainee_code, t.user_id, t.manager, t.status, u.full_name
       FROM trainees t
       JOIN users u ON u.user_id = t.user_id
       WHERE t.trainee_code = $1
       FOR UPDATE`,
      [traineeCode],
    );
    const traineeRow = trainee.rows[0];
    if (!traineeRow) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Intern not found." });
      return;
    }

    if (asString(traineeRow.status, "Active").toLowerCase() !== "active") {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Only active interns can be assigned." });
      return;
    }

    const currentManager = asString(traineeRow.manager).trim();
    if (currentManager && !managerMatchesEmployee(currentManager, employeeRow)) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: `${asString(traineeRow.full_name, "This intern")} is already assigned to ${currentManager}.` });
      return;
    }

    await client.query(
      `UPDATE trainees
       SET manager = $1, updated_by = $2, updated_at = NOW()
       WHERE trainee_code = $3`,
      [asString(employeeRow.full_name), req.authUser!.userId, traineeCode],
    );

    await client.query("COMMIT");

    const [employees, interns] = await Promise.all([readEmployees(), readTrainees()]);
    const updatedEmployee = employees.find((item) => item.id === employeeCode);
    const updatedIntern = interns.find((item) => item.id === traineeCode);

    res.json({
      ok: true,
      employee: updatedEmployee,
      intern: updatedIntern,
    });

  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    req.log?.error({ err: error }, "Intern assignment failed");
    res.status(500).json({ error: "Unable to assign intern." });
  } finally {
    client.release();
  }
});

router.post("/employees/:id/project", requireAuth, requireRole(PROJECT_MANAGERS), async (req, res): Promise<void> => {
  const employeeCode = text(req.params.id);
  const projectId = Number(req.body?.projectId);

  if (!employeeCode || !Number.isInteger(projectId) || projectId <= 0) {
    res.status(400).json({ error: "A valid employee and project are required." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const employeeResult = await client.query<{ user_id: string }>(
      "SELECT user_id FROM employees WHERE employee_code = $1",
      [employeeCode],
    );
    const employee = employeeResult.rows[0];
    if (!employee) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Employee not found." });
      return;
    }

    const projectResult = await client.query<{ id: number }>(
      "SELECT id FROM projects WHERE id = $1",
      [projectId],
    );
    if (!projectResult.rows[0]) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Project not found." });
      return;
    }

    await client.query("DELETE FROM project_members WHERE user_id = $1", [employee.user_id]);
    await client.query(
      `INSERT INTO project_members (project_id, user_id, member_role)
       VALUES ($1, $2, 'EMPLOYEE')`,
      [projectId, employee.user_id],
    );
    await client.query("COMMIT");

    res.json({ ok: true, employeeId: employeeCode, projectId: String(projectId) });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
});

router.get("/interns", requireAuth, async (req, res): Promise<void> => {
  try {
    res.json({ interns: await readTrainees() });
  } catch (error) {
    req.log?.error({ err: error }, "Intern list lookup failed");
    res.status(503).json({ error: "Unable to load interns from the database." });
  }
});

router.post("/interns", requireAuth, requireRole(INTERN_CREATORS), async (req, res): Promise<void> => {
  const body = req.body as CreateInternBody;
  const fullName = text(body.name);
  const role = normalizeRole(body.role);
  const status = normalizeStatus(body.status);
  const email = emailFor(fullName, body.email);
  const phone = optionalText(body.phone);
  const college = optionalText(body.college);
  const degree = optionalText(body.degree) ?? "B.Tech";
  const projectName = text(body.project);
  const manager = optionalText(body.manager);
  const startDate = optionalDate(body.startDate);
  const endDate = optionalDate(body.endDate);
  const cgpa = optionalNumber(body.cgpa);
  const year = optionalText(body.year);
  const gender = optionalText(body.gender);
  const dob = optionalDate(body.dob);
  const address = optionalText(body.address);
  const monthlySalary = asPositiveNumber(body.salary);
  const temporaryPassword = text(body.temporaryPassword);

  const errors: string[] = [];
  assertRequired(fullName, "Name", errors);
  assertRequired(temporaryPassword, "Temporary password", errors);
  if (role !== "INTERN") errors.push("Role must be Intern.");
  if (monthlySalary === null) errors.push("Salary must be a valid non-negative number.");
  assertRequired(projectName, "Project", errors);
  if (!startDate) errors.push("Start date is required.");
  if (!endDate) errors.push("End date is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("A valid email is required.");
  if (temporaryPassword && temporaryPassword.length < 8) errors.push("Temporary password must be at least 8 characters.");
  if (hasInvalidPhone(body.phone)) errors.push("Please enter a valid 10-digit phone number.");

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join(" ") });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const traineeCode = await nextCode(client, "trainees", "trainee_code", "INT");
    const userId = userIdFor(fullName, traineeCode, "first");
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const duplicateUser = await client.query("SELECT 1 FROM users WHERE user_id = $1 OR lower(email) = lower($2) LIMIT 1", [userId, email]);
    if (duplicateUser.rowCount) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "A user with this User ID or email already exists." });
      return;
    }

    const duplicateTrainee = await client.query("SELECT 1 FROM trainees WHERE trainee_code = $1 LIMIT 1", [traineeCode]);
    if (duplicateTrainee.rowCount) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "An intern with this Intern ID already exists." });
      return;
    }

    await client.query(
      `INSERT INTO users (user_id, password_hash, full_name, email, role, status)
       VALUES ($1, $2, $3, $4, 'INTERN'::user_role, $5::user_status)`,
      [userId, passwordHash, fullName, email, authStatus(status)],
    );

    await client.query(
      `INSERT INTO trainees (
        user_id, trainee_code, college, degree, phone, project_name, manager,
        start_date, end_date, cgpa, year, gender, dob, address, status, created_by, updated_by
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9::date, $10, $11, $12, $13::date, $14, $15, $16, $16)`,
      [
        userId,
        traineeCode,
        college,
        degree,
        phone,
        projectName,
        manager,
        startDate,
        endDate,
        cgpa,
        year,
        gender,
        dob,
        address,
        status,
        req.authUser!.userId,
      ],
    );

    await upsertSalaryProfile(client, traineeCode, "trainees", monthlySalary ?? 0);

    await client.query("COMMIT");

    res.status(201).json({
      intern: {
        id: traineeCode,
        userId,
        name: fullName,
        email,
        avatarUrl: null,
        phone: phone ?? "",
        college: college ?? "",
        role: "Intern",
        project: projectName,
        manager: manager ?? "",
        startDate,
        endDate,
        progress: 0,
        status,
        cgpa: cgpa ?? 0,
        dob: dob ?? "",
        gender: gender ?? "",
        address: address ?? "",
        degree,
        year: year ?? "",
        skills: [],
        salary: monthlySalary ?? 0,
      },
      temporaryPassword,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    req.log?.error({ err: error }, "Intern creation failed");
    res.status(500).json({ error: "Unable to create intern." });
  } finally {
    client.release();
  }
});

router.delete("/interns/:id", requireAuth, requireRole(ADMIN_ONLY), async (req, res): Promise<void> => {
  const traineeCode = text(req.params.id);
  if (!traineeCode) {
    res.status(400).json({ error: "Intern ID is required." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const trainee = await client.query<{ user_id: string; full_name: string }>(
      `SELECT t.user_id, u.full_name
       FROM trainees t
       JOIN users u ON u.user_id = t.user_id
       WHERE t.trainee_code = $1
       FOR UPDATE`,
      [traineeCode],
    );

    const row = trainee.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Intern not found." });
      return;
    }

    await client.query("DELETE FROM users WHERE user_id = $1", [row.user_id]);
    await client.query("COMMIT");

    res.json({ ok: true, internId: traineeCode, userId: row.user_id, name: row.full_name });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    req.log?.error({ err: error }, "Intern deletion failed");
    res.status(500).json({ error: "Unable to delete intern." });
  } finally {
    client.release();
  }
});

router.put("/employees/:id", requireAuth, requireRole(ADMIN_ONLY), async (req, res): Promise<void> => {
  const employeeCode = text(req.params.id);
  const body = req.body as UpdateEmployeeBody;
  const name = text(body.name);
  const designation = text(body.designation);
  const role = normalizeRole(body.role);
  const status = normalizeStatus(body.status);
  const email = emailFor(name, body.email);
  const phone = optionalText(body.phone);
  const bio = optionalText(body.bio);
  const monthlySalary = asPositiveNumber(body.salary);

  if (!employeeCode) {
    res.status(400).json({ error: "Employee ID is required." });
    return;
  }

  if (!name || !designation || !role || monthlySalary === null) {
    res.status(400).json({ error: "Name, designation, role and salary are required." });
    return;
  }
  if (hasInvalidPhone(body.phone)) {
    res.status(400).json({ error: "Please enter a valid 10-digit phone number." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query<DbRow>(`
      SELECT e.user_id
      FROM employees e
      WHERE e.employee_code = $1
      FOR UPDATE
    `, [employeeCode]);

    if (!existing.rows[0]) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Employee not found." });
      return;
    }

    await client.query(
      `UPDATE users
       SET full_name = $1, email = $2, role = $3::user_role, status = $4::user_status, updated_at = NOW()
       WHERE user_id = $5`,
      [name, email, role, authStatus(status), existing.rows[0].user_id],
    );

    await client.query(
      `UPDATE employees
       SET designation = $1, phone = $2, bio = $3, status = $4, updated_by = $5, updated_at = NOW()
       WHERE employee_code = $6`,
      [designation, phone, bio, status, req.authUser!.userId, employeeCode],
    );

    await upsertSalaryProfile(client, employeeCode, "employees", monthlySalary);
    await client.query("COMMIT");

    const employee = (await readEmployees()).find((item) => item.id === employeeCode);
    res.json({ employee, message: "Employee updated successfully." });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    req.log?.error({ err: error }, "Employee update failed");
    res.status(500).json({ error: "Unable to update employee." });
  } finally {
    client.release();
  }
});

router.put("/interns/:id", requireAuth, requireRole(INTERN_CREATORS), async (req, res): Promise<void> => {
  const traineeCode = text(req.params.id);
  const body = req.body as UpdateInternBody;
  const name = text(body.name);
  const role = normalizeRole(body.role);
  const status = normalizeStatus(body.status);
  const email = emailFor(name, body.email);
  const phone = optionalText(body.phone);
  const projectName = text(body.project);
  const manager = optionalText(body.manager);
  const startDate = optionalDate(body.startDate);
  const endDate = optionalDate(body.endDate);
  const gender = optionalText(body.gender);
  const dob = optionalDate(body.dob);
  const address = optionalText(body.address);
  const hasSalary = hasOwnField(body, "salary");
  const monthlySalary = hasSalary ? asPositiveNumber(body.salary) : null;

  if (!traineeCode) {
    res.status(400).json({ error: "Intern ID is required." });
    return;
  }

  if (!name || role !== "INTERN" || !projectName || !startDate || !endDate || (hasSalary && monthlySalary === null)) {
    res.status(400).json({ error: "Name, project, dates, role, and valid salary when provided are required." });
    return;
  }
  if (hasInvalidPhone(body.phone)) {
    res.status(400).json({ error: "Please enter a valid 10-digit phone number." });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query<DbRow>(`
      SELECT t.user_id, t.college, t.degree, t.cgpa, t.year
      FROM trainees t
      WHERE t.trainee_code = $1
      FOR UPDATE OF t
    `, [traineeCode]);

    if (!existing.rows[0]) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Intern not found." });
      return;
    }

    const currentIntern = existing.rows[0];
    const college = hasOwnField(body, "college") ? optionalText(body.college) : currentIntern.college;
    const degree = hasOwnField(body, "degree") ? optionalText(body.degree) ?? "B.Tech" : currentIntern.degree;
    const cgpa = hasOwnField(body, "cgpa") ? optionalNumber(body.cgpa) : currentIntern.cgpa;
    const year = hasOwnField(body, "year") ? optionalText(body.year) : currentIntern.year;

    await client.query(
      `UPDATE users
       SET full_name = $1, email = $2, role = 'INTERN'::user_role, status = $3::user_status, updated_at = NOW()
       WHERE user_id = $4`,
      [name, email, authStatus(status), existing.rows[0].user_id],
    );

    await client.query(
      `UPDATE trainees
       SET college = $1, degree = $2, phone = $3, project_name = $4, manager = $5,
           start_date = $6::date, end_date = $7::date, cgpa = $8, year = $9, gender = $10,
           dob = $11::date, address = $12, status = $13, updated_by = $14, updated_at = NOW()
       WHERE trainee_code = $15`,
      [college, degree, phone, projectName, manager, startDate, endDate, cgpa, year, gender, dob, address, status, req.authUser!.userId, traineeCode],
    );

    if (hasSalary && monthlySalary !== null) {
      await upsertSalaryProfile(client, traineeCode, "trainees", monthlySalary);
    }

    await client.query("COMMIT");

    const intern = (await readTrainees()).find((item) => item.id === traineeCode);
    res.json({ intern, message: "Intern updated successfully." });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    req.log?.error({ err: error }, "Intern update failed");
    res.status(500).json({ error: "Unable to update intern." });
  } finally {
    client.release();
  }
});

export default router;
