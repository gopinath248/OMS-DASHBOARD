import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

type DbRow = Record<string, unknown>;

type SalaryEmployee = {
  id: string;
  source: string;
  userId: string | null;
  name: string;
  email: string;
  avatarUrl: string | null;
  department: string;
  designation: string;
  role: string;
  status: string;
  monthlySalary: number;
};

type SalaryPolicy = {
  weeklyOffDays: number[];
  hraPercent: number;
  travelPercent: number;
  medicalPercent: number;
  bonusPercent: number;
  pfPercent: number;
  professionalTax: number;
  unknownLeavePaid: boolean;
};

const ADMIN_ONLY = ["ADMIN"] as const;
const DAY_MS = 86_400_000;

function asString(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDate(value: unknown) {
  if (value instanceof Date) return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const [year, month, day] = asString(value).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * DAY_MS);
}

function eachDate(start: Date, end: Date) {
  const dates: Date[] = [];
  for (let current = start; current <= end; current = addDays(current, 1)) dates.push(current);
  return dates;
}

function monthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("Month must use YYYY-MM format.");
  }

  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1));
  const end = new Date(Date.UTC(year, monthIndex, 0));

  return {
    month,
    payMonth: dateKey(start),
    label: start.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }),
    start,
    end,
    calendarDays: end.getUTCDate(),
  };
}

function normalizeLeaveType(value: unknown) {
  return asString(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function displayLeaveType(value: unknown) {
  const parsed = asString(value, "Other Leave").trim();
  return parsed || "Other Leave";
}

async function tableExists(tableName: string) {
  const result = await pool.query<{ exists: boolean }>("SELECT to_regclass($1) IS NOT NULL AS exists", [`public.${tableName}`]);
  return Boolean(result.rows[0]?.exists);
}

async function readPolicy(): Promise<SalaryPolicy> {
  const result = await pool.query<DbRow>(`
    SELECT weekly_off_days, hra_percent, travel_percent, medical_percent, bonus_percent,
           pf_percent, professional_tax, unknown_leave_paid
    FROM salary_policy_settings
    WHERE id = TRUE
  `);
  const row = result.rows[0] ?? {};
  const weeklyOffDays = Array.isArray(row.weekly_off_days)
    ? row.weekly_off_days.map(Number).filter((day) => day >= 0 && day <= 6)
    : [0];

  return {
    weeklyOffDays: weeklyOffDays.length ? weeklyOffDays : [0],
    hraPercent: asNumber(row.hra_percent, 40),
    travelPercent: asNumber(row.travel_percent, 8),
    medicalPercent: asNumber(row.medical_percent, 5),
    bonusPercent: asNumber(row.bonus_percent, 12),
    pfPercent: asNumber(row.pf_percent, 12),
    professionalTax: asNumber(row.professional_tax, 200),
    unknownLeavePaid: Boolean(row.unknown_leave_paid),
  };
}

async function readLeavePolicies() {
  const result = await pool.query<DbRow>("SELECT leave_type, is_paid FROM salary_leave_policies ORDER BY leave_type");
  return new Map(result.rows.map((row) => [normalizeLeaveType(row.leave_type), Boolean(row.is_paid)]));
}

async function readEmployees() {
  const legacyStaffExists = await tableExists("cc1_app_staff");
  const legacySql = legacyStaffExists
    ? `
      UNION ALL
      SELECT s.id AS employee_id, 'cc1_app_staff' AS employee_source, NULL::text AS user_id,
             s.name AS full_name, s.email, NULL::text AS avatar_url, NULL::text AS department_name, s.designation,
             s.role, s.status, COALESCE(p.monthly_salary, settings.default_monthly_salary) AS monthly_salary
      FROM cc1_app_staff s
      CROSS JOIN salary_policy_settings settings
      LEFT JOIN employee_salary_profiles p ON p.employee_id = s.id
      WHERE NOT EXISTS (
        SELECT 1 FROM employees e WHERE e.employee_code = s.id
      )
    `
    : "";

  const result = await pool.query<DbRow>(`
    SELECT e.employee_code AS employee_id, 'employees' AS employee_source, e.user_id,
           u.full_name, u.email, u.avatar_url, d.name AS department_name, e.designation,
           u.role::text AS role, e.status, COALESCE(p.monthly_salary, settings.default_monthly_salary) AS monthly_salary
    FROM employees e
    JOIN users u ON u.user_id = e.user_id
    CROSS JOIN salary_policy_settings settings
    LEFT JOIN departments d ON d.id = e.department_id
    LEFT JOIN employee_salary_profiles p ON p.employee_id = e.employee_code
    ${legacySql}
    ORDER BY employee_id
  `);

  return result.rows.map((row): SalaryEmployee => ({
    id: asString(row.employee_id),
    source: asString(row.employee_source, "employees"),
    userId: row.user_id === null || row.user_id === undefined ? null : asString(row.user_id),
    name: asString(row.full_name),
    email: asString(row.email),
    avatarUrl: row.avatar_url === null || row.avatar_url === undefined ? null : asString(row.avatar_url),
    department: asString(row.department_name, "Unassigned"),
    designation: asString(row.designation, "Employee"),
    role: asString(row.role, "EMPLOYEE"),
    status: asString(row.status, "Active"),
    monthlySalary: asNumber(row.monthly_salary),
  }));
}

async function readEmployee(employeeId: string) {
  const employees = await readEmployees();
  return employees.find((employee) => employee.id === employeeId) ?? null;
}

async function readHolidayDates(range: ReturnType<typeof monthRange>) {
  const holidayDates = new Set<string>();
  const eventRows = await pool.query<DbRow>(`
    SELECT starts_at::date AS date, title, event_type
    FROM events
    WHERE starts_at::date BETWEEN $1::date AND $2::date
      AND (event_type ILIKE '%holiday%' OR title ILIKE '%holiday%' OR title ILIKE '%closed%')
  `, [dateKey(range.start), dateKey(range.end)]);

  for (const row of eventRows.rows) holidayDates.add(dateKey(parseDate(row.date)));

  if (await tableExists("cc1_app_events")) {
    const legacyRows = await pool.query<DbRow>(`
      SELECT date, title, type
      FROM cc1_app_events
      WHERE date BETWEEN $1::date AND $2::date
        AND (type ILIKE '%holiday%' OR title ILIKE '%holiday%' OR title ILIKE '%closed%')
    `, [dateKey(range.start), dateKey(range.end)]);
    for (const row of legacyRows.rows) holidayDates.add(dateKey(parseDate(row.date)));
  }

  return holidayDates;
}

async function readLeaveRows(employee: SalaryEmployee, range: ReturnType<typeof monthRange>) {
  const leaveRows: DbRow[] = [];

  const canonical = await pool.query<DbRow>(`
    SELECT lr.id::text AS id, lr.leave_type, lr.start_date, lr.end_date, lr.status,
           NULL::double precision AS duration, NULL::text AS day_portion, 'leave_requests' AS source
    FROM leave_requests lr
    JOIN users u ON u.user_id = lr.user_id
    WHERE (lr.user_id = $1 OR lower(u.full_name) = lower($2))
      AND lr.start_date <= $4::date
      AND lr.end_date >= $3::date
  `, [employee.userId, employee.name, dateKey(range.start), dateKey(range.end)]);
  leaveRows.push(...canonical.rows);

  if (await tableExists("cc1_app_leave_requests")) {
    const legacy = await pool.query<DbRow>(`
      SELECT id, type AS leave_type, start_date, end_date, status, duration, day_portion,
             'cc1_app_leave_requests' AS source
      FROM cc1_app_leave_requests
      WHERE lower(intern_name) = lower($1)
        AND start_date <= $3::date
        AND end_date >= $2::date
    `, [employee.name, dateKey(range.start), dateKey(range.end)]);
    leaveRows.push(...legacy.rows);
  }

  return leaveRows;
}

async function calculateSalary(employee: SalaryEmployee, month: string) {
  const range = monthRange(month);
  const policy = await readPolicy();
  const leavePolicies = await readLeavePolicies();
  const holidayDates = await readHolidayDates(range);
  const allDates = eachDate(range.start, range.end);
  const weeklyOffDates = new Set(allDates.filter((date) => policy.weeklyOffDays.includes(date.getUTCDay())).map(dateKey));
  const companyHolidayDates = new Set([...holidayDates].filter((date) => !weeklyOffDates.has(date)));
  const nonWorkingDates = new Set([...weeklyOffDates, ...companyHolidayDates]);
  const workingDateKeys = new Set(allDates.map(dateKey).filter((date) => !nonWorkingDates.has(date)));
  const leaveRows = await readLeaveRows(employee, range);
  const seenRequests = new Set<string>();
  const usedByDate = new Map<string, number>();
  const leaveByType = new Map<string, { paid: boolean; days: number }>();

  for (const row of leaveRows) {
    const status = asString(row.status).toLowerCase();
    if (status !== "approved") continue;

    const start = parseDate(row.start_date);
    const end = parseDate(row.end_date);
    const requestKey = [
      normalizeLeaveType(row.leave_type),
      dateKey(start),
      dateKey(end),
      asString(row.duration),
      asString(row.day_portion),
    ].join("|");
    if (seenRequests.has(requestKey)) continue;
    seenRequests.add(requestKey);

    const leaveType = displayLeaveType(row.leave_type);
    const normalizedType = normalizeLeaveType(leaveType);
    const isPaid = leavePolicies.get(normalizedType) ?? policy.unknownLeavePaid;
    const dates = eachDate(
      start < range.start ? range.start : start,
      end > range.end ? range.end : end,
    ).map(dateKey).filter((date) => workingDateKeys.has(date));
    if (!dates.length) continue;

    const duration = asNumber(row.duration, dates.length);
    const portion = asString(row.day_portion).toLowerCase();
    const baseFraction = dates.length === 1 && (duration === 0.5 || portion.includes("half")) ? 0.5 : 1;
    const distributedFraction = duration > 0 && duration < dates.length ? duration / dates.length : baseFraction;

    for (const date of dates) {
      const alreadyUsed = usedByDate.get(date) ?? 0;
      const available = Math.max(1 - alreadyUsed, 0);
      const applied = Math.min(distributedFraction, available);
      if (applied <= 0) continue;

      usedByDate.set(date, alreadyUsed + applied);
      const existing = leaveByType.get(leaveType) ?? { paid: isPaid, days: 0 };
      existing.days = money(existing.days + applied);
      existing.paid = isPaid;
      leaveByType.set(leaveType, existing);
    }
  }

  const leaveSummary = [...leaveByType.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, value]) => ({ type, days: value.days, paid: value.paid }));
  const paidLeaveDays = money(leaveSummary.filter((item) => item.paid).reduce((sum, item) => sum + item.days, 0));
  const unpaidLeaveDays = money(leaveSummary.filter((item) => !item.paid).reduce((sum, item) => sum + item.days, 0));
  const totalLeaveDays = money(paidLeaveDays + unpaidLeaveDays);
  const workingDays = workingDateKeys.size;
  const presentDays = money(Math.max(workingDays - totalLeaveDays, 0));

  const monthlySalary = money(employee.monthlySalary);
  const hra = money(monthlySalary * policy.hraPercent / 100);
  const travel = money(monthlySalary * policy.travelPercent / 100);
  const medical = money(monthlySalary * policy.medicalPercent / 100);
  const bonus = money(monthlySalary * policy.bonusPercent / 100);
  const grossSalary = money(monthlySalary + hra + travel + medical + bonus);
  const dailyRate = workingDays > 0 ? money(grossSalary / workingDays) : 0;
  const leaveDeduction = money(unpaidLeaveDays * dailyRate);
  const providentFund = money(monthlySalary * policy.pfPercent / 100);
  const professionalTax = money(policy.professionalTax);
  const totalDeductions = money(providentFund + professionalTax + leaveDeduction);
  const netSalary = money(Math.max(grossSalary - totalDeductions, 0));

  const assignment = await pool.query<DbRow>(`
    SELECT id, assigned_at, net_salary
    FROM salary_assignments
    WHERE employee_id = $1 AND pay_month = $2::date
    LIMIT 1
  `, [employee.id, range.payMonth]);

  return {
    employee,
    month: range.month,
    monthLabel: range.label,
    payMonth: range.payMonth,
    salary: {
      monthlySalary,
      hra,
      travel,
      medical,
      bonus,
      grossSalary,
      dailyRate,
      providentFund,
      professionalTax,
      leaveDeduction,
      totalDeductions,
      netSalary,
    },
    attendance: {
      source: "No attendance table is configured; present days are derived from working days minus approved leave.",
      calendarDays: range.calendarDays,
      weeklyOffs: weeklyOffDates.size,
      companyHolidays: companyHolidayDates.size,
      workingDays,
      presentDays,
      absentDays: unpaidLeaveDays,
      holidayDates: [...companyHolidayDates].sort(),
      weeklyOffDates: [...weeklyOffDates].sort(),
    },
    leave: {
      summary: leaveSummary,
      totalLeaveDays,
      paidLeaveDays,
      unpaidLeaveDays,
      ignoredStatuses: ["Pending", "Rejected", "Cancelled"],
      duplicateHandling: "Duplicate requests with the same type/start/end/duration are counted once; leave on weekly offs or holidays is excluded.",
      unknownLeavePaid: policy.unknownLeavePaid,
    },
    assignment: assignment.rows[0]
      ? {
          exists: true,
          id: asNumber(assignment.rows[0].id),
          assignedAt: asString(assignment.rows[0].assigned_at),
          netSalary: asNumber(assignment.rows[0].net_salary),
        }
      : { exists: false },
  };
}

router.get("/salary/dashboard", requireAuth, requireRole([...ADMIN_ONLY]), async (req, res): Promise<void> => {
  try {
    const month = asString(req.query.month, new Date().toISOString().slice(0, 7));
    const employees = await readEmployees();
    const calculations = await Promise.all(employees.map((employee) => calculateSalary(employee, month)));
    const records = calculations.map((calculation) => ({
      ...calculation.employee,
      month: calculation.month,
      monthlySalary: calculation.salary.monthlySalary,
      grossSalary: calculation.salary.grossSalary,
      netSalary: calculation.salary.netSalary,
      leaveDeduction: calculation.salary.leaveDeduction,
      paidLeaveDays: calculation.leave.paidLeaveDays,
      unpaidLeaveDays: calculation.leave.unpaidLeaveDays,
      assignment: calculation.assignment,
    }));

    res.json({
      month,
      records,
      summary: {
        employeeCount: records.length,
        totalMonthlySalary: money(records.reduce((sum, record) => sum + record.netSalary, 0)),
        avgMonthlySalary: records.length ? money(records.reduce((sum, record) => sum + record.netSalary, 0) / records.length) : 0,
        assignedCount: records.filter((record) => record.assignment.exists).length,
        pendingCount: records.filter((record) => !record.assignment.exists).length,
      },
    });
  } catch (error) {
    req.log?.error({ err: error }, "Salary dashboard lookup failed");
    res.status(500).json({ error: error instanceof Error ? error.message : "Unable to load salary dashboard." });
  }
});

router.get("/salary/calculation/:employeeId", requireAuth, requireRole([...ADMIN_ONLY]), async (req, res): Promise<void> => {
  try {
    const employee = await readEmployee(asString(req.params.employeeId));
    if (!employee) {
      res.status(404).json({ error: "Employee not found." });
      return;
    }

    res.json(await calculateSalary(employee, asString(req.query.month, new Date().toISOString().slice(0, 7))));
  } catch (error) {
    req.log?.error({ err: error }, "Salary calculation failed");
    res.status(500).json({ error: error instanceof Error ? error.message : "Unable to calculate salary." });
  }
});

router.post("/salary/assign", requireAuth, requireRole([...ADMIN_ONLY]), async (req, res): Promise<void> => {
  const employeeId = asString(req.body?.employeeId);
  const month = asString(req.body?.month);
  const updateExisting = Boolean(req.body?.updateExisting);

  if (!employeeId || !month) {
    res.status(400).json({ error: "Employee ID and month are required." });
    return;
  }

  try {
    const employee = await readEmployee(employeeId);
    if (!employee) {
      res.status(404).json({ error: "Employee not found." });
      return;
    }

    const calculation = await calculateSalary(employee, month);
    if (calculation.assignment.exists && !updateExisting) {
      res.status(409).json({ error: "Existing Salary Found", assignment: calculation.assignment, calculation });
      return;
    }

    const saved = await pool.query<DbRow>(`
      INSERT INTO salary_assignments (
        employee_id, employee_source, employee_name, employee_user_id, pay_month,
        monthly_salary, gross_salary, total_deductions, leave_deduction, net_salary,
        calculation, assigned_by
      )
      VALUES ($1, $2, $3, $4, $5::date, $6, $7, $8, $9, $10, $11::jsonb, $12)
      ON CONFLICT (employee_id, pay_month) DO UPDATE SET
        employee_source = EXCLUDED.employee_source,
        employee_name = EXCLUDED.employee_name,
        employee_user_id = EXCLUDED.employee_user_id,
        monthly_salary = EXCLUDED.monthly_salary,
        gross_salary = EXCLUDED.gross_salary,
        total_deductions = EXCLUDED.total_deductions,
        leave_deduction = EXCLUDED.leave_deduction,
        net_salary = EXCLUDED.net_salary,
        calculation = EXCLUDED.calculation,
        assigned_by = EXCLUDED.assigned_by,
        updated_at = NOW()
      RETURNING id, employee_id, pay_month, net_salary, assigned_at, updated_at
    `, [
      employee.id,
      employee.source,
      employee.name,
      employee.userId,
      calculation.payMonth,
      calculation.salary.monthlySalary,
      calculation.salary.grossSalary,
      calculation.salary.totalDeductions,
      calculation.salary.leaveDeduction,
      calculation.salary.netSalary,
      JSON.stringify(calculation),
      req.authUser!.userId,
    ]);

    res.status(calculation.assignment.exists ? 200 : 201).json({ assignment: saved.rows[0], calculation });
  } catch (error) {
    req.log?.error({ err: error }, "Salary assignment failed");
    res.status(500).json({ error: error instanceof Error ? error.message : "Unable to assign salary." });
  }
});

export default router;
