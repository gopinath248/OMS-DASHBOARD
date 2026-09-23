import { sql } from "drizzle-orm";
import { db } from "./index";

const CREATE_ENUM_STATEMENTS = [
  `DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'EMPLOYEE', 'INTERN', 'HR', 'MANAGER');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ADMIN'`,
  `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'EMPLOYEE'`,
  `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'INTERN'`,
  `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'HR'`,
  `ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'MANAGER'`,
  `DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('Active', 'Inactive');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
  `DO $$ BEGIN
    CREATE TYPE dms_role AS ENUM ('admin', 'staff');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
];

const CREATE_TABLE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL,
    status user_status NOT NULL DEFAULT 'Active',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
  )`,
  `UPDATE users SET role = 'ADMIN'::user_role WHERE role::text IN ('Admin', 'SuperAdmin')`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`,
  `UPDATE users SET role = 'EMPLOYEE'::user_role WHERE role::text = 'Employee'`,
  `UPDATE users SET role = 'INTERN'::user_role WHERE role::text IN ('Intern', 'TRAINEE')`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_user_id_upper_idx ON users (UPPER(user_id))`,
  `CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    employee_code TEXT NOT NULL UNIQUE,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    designation TEXT,
    phone TEXT,
    bio TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS trainees (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    trainee_code TEXT NOT NULL UNIQUE,
    college TEXT,
    degree TEXT,
    phone TEXT,
    project_name TEXT,
    manager TEXT,
    start_date DATE,
    end_date DATE,
    cgpa NUMERIC(4,2),
    year TEXT,
    gender TEXT,
    dob DATE,
    address TEXT,
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE employees ADD COLUMN IF NOT EXISTS bio TEXT`,
  `ALTER TABLE trainees ADD COLUMN IF NOT EXISTS phone TEXT`,
  `ALTER TABLE trainees ADD COLUMN IF NOT EXISTS project_name TEXT`,
  `ALTER TABLE trainees ADD COLUMN IF NOT EXISTS manager TEXT`,
  `ALTER TABLE trainees ADD COLUMN IF NOT EXISTS start_date DATE`,
  `ALTER TABLE trainees ADD COLUMN IF NOT EXISTS end_date DATE`,
  `ALTER TABLE trainees ADD COLUMN IF NOT EXISTS cgpa NUMERIC(4,2)`,
  `ALTER TABLE trainees ADD COLUMN IF NOT EXISTS year TEXT`,
  `ALTER TABLE trainees ADD COLUMN IF NOT EXISTS gender TEXT`,
  `ALTER TABLE trainees ADD COLUMN IF NOT EXISTS dob DATE`,
  `ALTER TABLE trainees ADD COLUMN IF NOT EXISTS address TEXT`,
  `CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Planning',
    created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    member_role TEXT NOT NULL DEFAULT 'MEMBER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS sprints (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Planned',
    start_date DATE,
    end_date DATE,
    created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    sprint_id INTEGER REFERENCES sprints(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'To Do',
    priority TEXT NOT NULL DEFAULT 'Medium',
    assigned_to TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    decided_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    decision_reason TEXT,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS decision_reason TEXT`,
  `ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS half_day BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS half_day_period TEXT`,
  `CREATE TABLE IF NOT EXISTS salary_policy_settings (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    weekly_off_days INTEGER[] NOT NULL DEFAULT ARRAY[0],
    hra_percent NUMERIC(5,2) NOT NULL DEFAULT 40,
    travel_percent NUMERIC(5,2) NOT NULL DEFAULT 8,
    medical_percent NUMERIC(5,2) NOT NULL DEFAULT 5,
    bonus_percent NUMERIC(5,2) NOT NULL DEFAULT 12,
    pf_percent NUMERIC(5,2) NOT NULL DEFAULT 12,
    professional_tax NUMERIC(12,2) NOT NULL DEFAULT 200,
    default_monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 80000,
    unknown_leave_paid BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `INSERT INTO salary_policy_settings (id)
   VALUES (TRUE)
   ON CONFLICT (id) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS salary_leave_policies (
    leave_type TEXT PRIMARY KEY,
    is_paid BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `INSERT INTO salary_leave_policies (leave_type, is_paid)
   VALUES
    ('Sick Leave', TRUE),
    ('Casual Leave', TRUE),
    ('Personal Leave', FALSE),
    ('Emergency Leave', FALSE)
   ON CONFLICT (leave_type) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS employee_salary_profiles (
    employee_id TEXT PRIMARY KEY,
    employee_source TEXT NOT NULL DEFAULT 'employees',
    monthly_salary NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS salary_assignments (
    id SERIAL PRIMARY KEY,
    employee_id TEXT NOT NULL,
    employee_source TEXT NOT NULL DEFAULT 'employees',
    employee_name TEXT NOT NULL,
    employee_user_id TEXT,
    pay_month DATE NOT NULL,
    monthly_salary NUMERIC(12,2) NOT NULL,
    gross_salary NUMERIC(12,2) NOT NULL,
    total_deductions NUMERIC(12,2) NOT NULL,
    leave_deduction NUMERIC(12,2) NOT NULL,
    net_salary NUMERIC(12,2) NOT NULL,
    calculation JSONB NOT NULL DEFAULT '{}'::jsonb,
    assigned_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, pay_month)
  )`,
  `CREATE INDEX IF NOT EXISTS salary_assignments_employee_month_idx ON salary_assignments(employee_id, pay_month)`,
  `INSERT INTO employee_salary_profiles (employee_id, employee_source, monthly_salary)
   SELECT e.employee_code, 'employees',
          CASE COALESCE(e.designation, '')
            WHEN 'Senior Engineer' THEN 95000
            WHEN 'Lead Data Scientist' THEN 105000
            WHEN 'Product Manager' THEN 90000
            WHEN 'DevOps Lead' THEN 98000
            WHEN 'ML Research Engineer' THEN 102000
            WHEN 'Full Stack Engineer' THEN 85000
            WHEN 'HR Specialist' THEN 72000
            WHEN 'Hardware Engineer' THEN 80000
            WHEN 'Power Systems Expert' THEN 88000
            WHEN 'Security Engineer' THEN 92000
            ELSE (SELECT default_monthly_salary FROM salary_policy_settings WHERE id = TRUE)
          END
   FROM employees e
   ON CONFLICT (employee_id) DO NOTHING`,
  `DO $$
   BEGIN
     IF to_regclass('public.cc1_app_staff') IS NOT NULL THEN
       INSERT INTO employee_salary_profiles (employee_id, employee_source, monthly_salary)
       SELECT s.id, 'cc1_app_staff',
              CASE COALESCE(s.designation, '')
                WHEN 'Senior Engineer' THEN 95000
                WHEN 'Lead Data Scientist' THEN 105000
                WHEN 'Product Manager' THEN 90000
                WHEN 'DevOps Lead' THEN 98000
                WHEN 'ML Research Engineer' THEN 102000
                WHEN 'Full Stack Engineer' THEN 85000
                WHEN 'HR Specialist' THEN 72000
                WHEN 'Hardware Engineer' THEN 80000
                WHEN 'Power Systems Expert' THEN 88000
                WHEN 'Security Engineer' THEN 92000
                ELSE (SELECT default_monthly_salary FROM salary_policy_settings WHERE id = TRUE)
              END
       FROM cc1_app_staff s
       ON CONFLICT (employee_id) DO NOTHING;
     END IF;
   END $$`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'System',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    sender_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS chat_conversations (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL CHECK (kind IN ('channel', 'direct')),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    avatar TEXT,
    direct_key TEXT UNIQUE,
    created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS chat_conversation_members (
    conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    member_role TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    PRIMARY KEY (conversation_id, user_id)
  )`,
  `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS conversation_id TEXT REFERENCES chat_conversations(id) ON DELETE CASCADE`,
  `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS client_message_id TEXT`,
  `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text'`,
  `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to_message_id INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL`,
  `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment JSONB`,
  `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ`,
  `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
  `CREATE TABLE IF NOT EXISTS chat_reads (
    conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    last_read_message_id INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
  )`,
  `INSERT INTO chat_conversations (id, kind, title, description, avatar)
   VALUES
    ('channel:announcements', 'channel', 'Announcements', 'Official company announcements and policy updates', 'Megaphone'),
    ('channel:leave-requests', 'channel', 'Leave Requests', 'Leave approvals, rejections, and status updates', 'CalendarDays'),
    ('channel:project-updates', 'channel', 'Project Updates', 'Project progress, milestones, and blockers', 'FolderOpen'),
    ('channel:sprint-updates', 'channel', 'Sprint Updates', 'Sprint ceremonies, stories, and velocity tracking', 'Kanban'),
    ('channel:general', 'channel', 'General', 'General discussion, water-cooler chats', 'Hash'),
    ('channel:hr-updates', 'channel', 'HR Updates', 'HR policies, onboarding, performance news', 'Users'),
    ('channel:task-completions', 'channel', 'Task Completions', 'Task done notifications and recognition', 'CheckCircle2')
   ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    avatar = EXCLUDED.avatar,
    updated_at = NOW()`,
  `INSERT INTO chat_conversation_members (conversation_id, user_id, member_role)
   SELECT c.id, u.user_id, 'member'
   FROM chat_conversations c
   CROSS JOIN users u
   WHERE c.kind = 'channel' AND u.status = 'Active'
   ON CONFLICT (conversation_id, user_id) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS chat_message_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reaction TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(message_id, user_id, reaction)
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'Event',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    created_by TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    actor_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS employees_department_id_idx ON employees(department_id)`,
  `CREATE INDEX IF NOT EXISTS trainees_department_id_idx ON trainees(department_id)`,
  `CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON project_members(user_id)`,
  `CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON tasks(assigned_to)`,
  `CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status)`,
  `CREATE INDEX IF NOT EXISTS leave_requests_user_id_idx ON leave_requests(user_id)`,
  `CREATE INDEX IF NOT EXISTS leave_requests_status_idx ON leave_requests(status)`,
  `CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id)`,
  `CREATE INDEX IF NOT EXISTS chat_conversations_kind_idx ON chat_conversations(kind)`,
  `CREATE INDEX IF NOT EXISTS chat_conversation_members_user_idx ON chat_conversation_members(user_id)`,
  `CREATE INDEX IF NOT EXISTS chat_messages_conversation_created_idx ON chat_messages(conversation_id, created_at, id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_sender_client_id_idx ON chat_messages(sender_id, client_message_id) WHERE client_message_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS chat_message_reactions_message_idx ON chat_message_reactions(message_id)`,
  `CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_idx ON audit_logs(actor_user_id)`,
  `CREATE TABLE IF NOT EXISTS dms_users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role dms_role NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS dms_projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS dms_documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    uploaded_by INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
];

export async function ensureDatabaseReady() {
  await db.execute(sql`SELECT 1`);

  for (const statement of CREATE_ENUM_STATEMENTS) {
    await db.execute(sql.raw(statement));
  }

  for (const statement of CREATE_TABLE_STATEMENTS) {
    await db.execute(sql.raw(statement));
  }

  return {
    ok: true,
    tables: [
      "users",
      "departments",
      "employees",
      "trainees",
      "projects",
      "project_members",
      "sprints",
      "tasks",
      "leave_requests",
      "salary_policy_settings",
      "salary_leave_policies",
      "employee_salary_profiles",
      "salary_assignments",
      "notifications",
      "chat_conversations",
      "chat_conversation_members",
      "chat_messages",
      "chat_message_reactions",
      "chat_reads",
      "events",
      "audit_logs",
      "dms_users",
      "dms_projects",
      "dms_documents",
    ],
  };
}

export async function initializeDatabase() {
  try {
    return await ensureDatabaseReady();
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
}
