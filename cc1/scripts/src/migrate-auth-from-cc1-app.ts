import bcrypt from "bcryptjs";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const HOST = process.env.DB_HOST ?? "localhost";
const PORT = process.env.DB_PORT ?? "5432";
const USER = process.env.DB_USER ?? "postgres";
const PASSWORD = process.env.DB_PASSWORD;
const OLD_DATABASE = "cc1_app";
const NEW_DATABASE = "smart_cp";
const DEFAULT_PSQL = "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe";
const PSQL = process.env.PSQL_PATH ?? (existsSync(DEFAULT_PSQL) ? DEFAULT_PSQL : "psql");

const USER_ROLES = new Set(["ADMIN", "EMPLOYEE", "INTERN", "HR", "MANAGER"]);
const USER_STATUSES = new Set(["Active", "Inactive"]);
const DMS_ROLES = new Set(["admin", "staff"]);

type ColumnInfo = {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
};

type SafeUser = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  status: string | null;
};

type OldUser = SafeUser & {
  password_hash: string;
  created_at: string | null;
  updated_at: string | null;
  last_login: string | null;
};

type SafeDmsUser = {
  id: number;
  email: string;
  name: string | null;
  role: string | null;
};

type OldDmsUser = SafeDmsUser & {
  password_hash: string;
  created_at: string | null;
};

type OldDmsProject = {
  id: number;
  name: string;
  type: string;
  description: string | null;
  created_by: number;
  created_at: string | null;
  updated_at: string | null;
};

type OldDmsDocument = {
  id: number;
  title: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  project_id: number;
  uploaded_by: number;
  created_at: string | null;
};

function requirePassword() {
  if (!PASSWORD) {
    throw new Error("DB_PASSWORD is required in the current terminal environment.");
  }
}

function runPsql(database: string, sql: string) {
  const result = spawnSync(
    PSQL,
    ["-w", "-h", HOST, "-p", PORT, "-U", USER, "-d", database, "-v", "ON_ERROR_STOP=1", "-q", "-t", "-A", "-f", "-"],
    {
      input: sql,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 20,
      env: {
        ...process.env,
        PGPASSWORD: PASSWORD,
      },
      windowsHide: true,
    },
  );

  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `psql exited with status ${result.status}`;
    throw new Error(detail);
  }

  return result.stdout.trim();
}

function parseLastJsonLine<T>(output: string): T {
  const jsonLine = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
  return JSON.parse(jsonLine ?? "null") as T;
}

function readOnlyJson<T>(database: string, selectSql: string): T {
  return parseLastJsonLine<T>(
    runPsql(
      database,
      `BEGIN READ ONLY;
SET TRANSACTION READ ONLY;
${selectSql}
COMMIT;`,
    ),
  );
}

function smartJson<T>(selectSql: string): T {
  return parseLastJsonLine<T>(runPsql(NEW_DATABASE, selectSql));
}

function sqlLiteral(value: string | number | null) {
  if (value === null) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${value.replace(/'/g, "''")}'`;
}

function hasColumn(columns: ColumnInfo[], name: string) {
  return columns.some((column) => column.column_name === name);
}

function assertColumns(table: string, columns: ColumnInfo[], required: string[]) {
  const missing = required.filter((column) => !hasColumn(columns, column));
  if (missing.length > 0) {
    throw new Error(`${table} is missing required column(s): ${missing.join(", ")}`);
  }
}

function columnSummary(columns: ColumnInfo[]) {
  return columns.map((column) => ({
    column: column.column_name,
    type: column.udt_name,
    nullable: column.is_nullable === "YES",
    hasDefault: column.column_default !== null,
  }));
}

function isBcryptHash(value: string) {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

function normalizeUserRole(role: string | null) {
  const normalized = (role ?? "EMPLOYEE").toUpperCase();
  if (normalized === "TRAINEE" || normalized === "STUDENT") return "INTERN";
  if (!USER_ROLES.has(normalized)) {
    throw new Error(`Unsupported users.role value encountered: ${normalized}`);
  }
  return normalized;
}

function normalizeUserStatus(status: string | null) {
  const normalized = status ?? "Active";
  if (USER_STATUSES.has(normalized)) return normalized;
  const lower = normalized.toLowerCase();
  if (lower === "active") return "Active";
  if (lower === "inactive") return "Inactive";
  throw new Error(`Unsupported users.status value encountered: ${normalized}`);
}

function normalizeDmsRole(role: string | null) {
  const normalized = (role ?? "staff").toLowerCase();
  if (!DMS_ROLES.has(normalized)) {
    throw new Error(`Unsupported dms_users.role value encountered: ${normalized}`);
  }
  return normalized;
}

function getColumns(database: string, table: string) {
  return readOnlyJson<ColumnInfo[]>(
    database,
    `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
FROM (
  SELECT column_name, data_type, udt_name, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = ${sqlLiteral(table)}
  ORDER BY ordinal_position
) t;`,
  );
}

function tableExists(database: string, table: string) {
  return readOnlyJson<boolean>(
    database,
    `SELECT to_json(EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = ${sqlLiteral(table)}
));`,
  );
}

function fetchOldUsers(columns: ColumnInfo[]) {
  if (!tableExists(OLD_DATABASE, "users")) return [];
  assertColumns("cc1_app.users", columns, ["user_id", "password_hash"]);

  const select = [
    "user_id",
    "password_hash",
    hasColumn(columns, "email") ? "email" : "NULL::text AS email",
    hasColumn(columns, "full_name") ? "full_name" : hasColumn(columns, "name") ? "name AS full_name" : "NULL::text AS full_name",
    hasColumn(columns, "role") ? "role::text AS role" : "NULL::text AS role",
    hasColumn(columns, "status") ? "status::text AS status" : "NULL::text AS status",
    hasColumn(columns, "created_at") ? "created_at::text AS created_at" : "NULL::text AS created_at",
    hasColumn(columns, "updated_at") ? "updated_at::text AS updated_at" : "NULL::text AS updated_at",
    hasColumn(columns, "last_login") ? "last_login::text AS last_login" : "NULL::text AS last_login",
  ];

  return readOnlyJson<OldUser[]>(
    OLD_DATABASE,
    `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
FROM (
  SELECT ${select.join(", ")}
  FROM users
  ORDER BY user_id
) t;`,
  );
}

function fetchOldDmsUsers(columns: ColumnInfo[]) {
  if (!tableExists(OLD_DATABASE, "dms_users")) return [];
  assertColumns("cc1_app.dms_users", columns, ["id", "email", "password_hash"]);

  const select = [
    "id",
    "email",
    "password_hash",
    hasColumn(columns, "name") ? "name" : "email AS name",
    hasColumn(columns, "role") ? "role::text AS role" : "NULL::text AS role",
    hasColumn(columns, "created_at") ? "created_at::text AS created_at" : "NULL::text AS created_at",
  ];

  return readOnlyJson<OldDmsUser[]>(
    OLD_DATABASE,
    `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
FROM (
  SELECT ${select.join(", ")}
  FROM dms_users
  ORDER BY id
) t;`,
  );
}

function fetchOldDmsProjects(columns: ColumnInfo[]) {
  if (!tableExists(OLD_DATABASE, "dms_projects")) return [];
  assertColumns("cc1_app.dms_projects", columns, ["id", "name", "type", "created_by"]);

  const select = [
    "id",
    "name",
    "type",
    hasColumn(columns, "description") ? "description" : "''::text AS description",
    "created_by",
    hasColumn(columns, "created_at") ? "created_at::text AS created_at" : "NULL::text AS created_at",
    hasColumn(columns, "updated_at") ? "updated_at::text AS updated_at" : "NULL::text AS updated_at",
  ];

  return readOnlyJson<OldDmsProject[]>(
    OLD_DATABASE,
    `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
FROM (
  SELECT ${select.join(", ")}
  FROM dms_projects
  ORDER BY id
) t;`,
  );
}

function fetchOldDmsDocuments(columns: ColumnInfo[]) {
  if (!tableExists(OLD_DATABASE, "dms_documents")) return [];
  assertColumns("cc1_app.dms_documents", columns, ["id", "title", "file_name", "file_path", "file_type", "file_size", "project_id", "uploaded_by"]);

  const select = [
    "id",
    "title",
    "file_name",
    "file_path",
    "file_type",
    "file_size",
    "project_id",
    "uploaded_by",
    hasColumn(columns, "created_at") ? "created_at::text AS created_at" : "NULL::text AS created_at",
  ];

  return readOnlyJson<OldDmsDocument[]>(
    OLD_DATABASE,
    `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
FROM (
  SELECT ${select.join(", ")}
  FROM dms_documents
  ORDER BY id
) t;`,
  );
}

function smartSafeUsers() {
  if (!tableExists(NEW_DATABASE, "users")) return [];
  return smartJson<SafeUser[]>(
    `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
FROM (
  SELECT user_id, email, full_name, role::text AS role, status::text AS status
  FROM users
  ORDER BY user_id
) t;`,
  );
}

function smartSafeDmsUsers() {
  if (!tableExists(NEW_DATABASE, "dms_users")) return [];
  return smartJson<SafeDmsUser[]>(
    `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
FROM (
  SELECT id, email, name, role::text AS role
  FROM dms_users
  ORDER BY email
) t;`,
  );
}

function smartUserExists(userId: string, email: string) {
  return smartJson<boolean>(
    `SELECT to_json(EXISTS (
  SELECT 1 FROM users
  WHERE upper(user_id) = upper(${sqlLiteral(userId)})
     OR lower(email) = lower(${sqlLiteral(email)})
));`,
  );
}

function smartDmsUserExists(email: string) {
  return smartJson<boolean>(
    `SELECT to_json(EXISTS (
  SELECT 1 FROM dms_users
  WHERE lower(email) = lower(${sqlLiteral(email)})
));`,
  );
}

function smartIdExists(table: string, id: number) {
  return smartJson<boolean>(
    `SELECT to_json(EXISTS (
  SELECT 1 FROM ${table}
  WHERE id = ${sqlLiteral(id)}
));`,
  );
}

function reseedSerial(table: string) {
  runPsql(
    NEW_DATABASE,
    `SELECT setval(
  pg_get_serial_sequence(${sqlLiteral(table)}, 'id'),
  COALESCE((SELECT max(id) FROM ${table}), 1),
  (SELECT max(id) IS NOT NULL FROM ${table})
);`,
  );
}

function migrateUsers(users: OldUser[]) {
  const migrated: string[] = [];
  const skippedExisting: string[] = [];

  for (const user of users) {
    const userId = user.user_id.trim().toUpperCase();
    const email = user.email?.trim() || `${userId.toLowerCase()}@migrated.local`;
    const fullName = user.full_name?.trim() || userId;
    const role = normalizeUserRole(user.role);
    const status = normalizeUserStatus(user.status);
    const createdAt = user.created_at;
    const updatedAt = user.updated_at ?? createdAt;

    if (smartUserExists(userId, email)) {
      skippedExisting.push(userId);
      continue;
    }

    runPsql(
      NEW_DATABASE,
      `BEGIN;
INSERT INTO users (user_id, password_hash, full_name, email, role, status, created_at, updated_at, last_login)
VALUES (
  ${sqlLiteral(userId)},
  ${sqlLiteral(user.password_hash)},
  ${sqlLiteral(fullName)},
  ${sqlLiteral(email)},
  ${sqlLiteral(role)}::user_role,
  ${sqlLiteral(status)}::user_status,
  COALESCE(${sqlLiteral(createdAt)}, NOW()::text)::timestamptz,
  COALESCE(${sqlLiteral(updatedAt)}, NOW()::text)::timestamptz,
  ${sqlLiteral(user.last_login)}::timestamptz
);
COMMIT;`,
    );
    migrated.push(userId);
  }

  return { migrated, skippedExisting };
}

function migrateDmsUsers(users: OldDmsUser[]) {
  const migrated: string[] = [];
  const skippedExisting: string[] = [];

  for (const user of users) {
    const email = user.email.trim().toLowerCase();
    const name = user.name?.trim() || email;
    const role = normalizeDmsRole(user.role);

    if (smartDmsUserExists(email)) {
      skippedExisting.push(email);
      continue;
    }

    runPsql(
      NEW_DATABASE,
      `BEGIN;
INSERT INTO dms_users (name, email, password_hash, role, created_at)
VALUES (
  ${sqlLiteral(name)},
  ${sqlLiteral(email)},
  ${sqlLiteral(user.password_hash)},
  ${sqlLiteral(role)}::dms_role,
  COALESCE(${sqlLiteral(user.created_at)}, NOW()::text)::timestamptz
);
COMMIT;`,
    );
    migrated.push(email);
  }

  return { migrated, skippedExisting };
}

function migrateDmsProjects(projects: OldDmsProject[]) {
  const migrated: number[] = [];
  const skippedExisting: number[] = [];

  for (const project of projects) {
    if (smartIdExists("dms_projects", project.id)) {
      skippedExisting.push(project.id);
      continue;
    }

    runPsql(
      NEW_DATABASE,
      `BEGIN;
INSERT INTO dms_projects (id, name, type, description, created_by, created_at, updated_at)
VALUES (
  ${sqlLiteral(project.id)},
  ${sqlLiteral(project.name)},
  ${sqlLiteral(project.type)},
  ${sqlLiteral(project.description ?? "")},
  ${sqlLiteral(project.created_by)},
  COALESCE(${sqlLiteral(project.created_at)}, NOW()::text)::timestamptz,
  COALESCE(${sqlLiteral(project.updated_at)}, NOW()::text)::timestamptz
);
COMMIT;`,
    );
    migrated.push(project.id);
  }

  if (migrated.length > 0) reseedSerial("dms_projects");
  return { migrated, skippedExisting };
}

function smartDmsDocumentRefsExist(document: OldDmsDocument) {
  return smartJson<boolean>(
    `SELECT to_json(
  EXISTS (SELECT 1 FROM dms_projects WHERE id = ${sqlLiteral(document.project_id)})
  AND EXISTS (SELECT 1 FROM dms_users WHERE id = ${sqlLiteral(document.uploaded_by)})
);`,
  );
}

function migrateDmsDocuments(documents: OldDmsDocument[]) {
  const migrated: number[] = [];
  const skippedExisting: number[] = [];
  const skippedMissingRefs: number[] = [];

  for (const document of documents) {
    if (smartIdExists("dms_documents", document.id)) {
      skippedExisting.push(document.id);
      continue;
    }

    if (!smartDmsDocumentRefsExist(document)) {
      skippedMissingRefs.push(document.id);
      continue;
    }

    runPsql(
      NEW_DATABASE,
      `BEGIN;
INSERT INTO dms_documents (id, title, file_name, file_path, file_type, file_size, project_id, uploaded_by, created_at)
VALUES (
  ${sqlLiteral(document.id)},
  ${sqlLiteral(document.title)},
  ${sqlLiteral(document.file_name)},
  ${sqlLiteral(document.file_path)},
  ${sqlLiteral(document.file_type)},
  ${sqlLiteral(document.file_size)},
  ${sqlLiteral(document.project_id)},
  ${sqlLiteral(document.uploaded_by)},
  COALESCE(${sqlLiteral(document.created_at)}, NOW()::text)::timestamptz
);
COMMIT;`,
    );
    migrated.push(document.id);
  }

  if (migrated.length > 0) reseedSerial("dms_documents");
  return { migrated, skippedExisting, skippedMissingRefs };
}

async function verifyOptionalLogin(userId: string | undefined, password: string | undefined) {
  if (!userId || !password) return "skipped: AUTH_TEST_USER_ID and AUTH_TEST_PASSWORD were not both set";

  const rows = smartJson<Array<{ user_id: string; password_hash: string; status: string }>>(
    `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
FROM (
  SELECT user_id, password_hash, status::text AS status
  FROM users
  WHERE upper(user_id) = upper(${sqlLiteral(userId)})
  LIMIT 1
) t;`,
  );
  const user = rows[0];
  if (!user) return "failed: user not found in smart_cp";
  if (user.status !== "Active") return "failed: user is not Active";
  return (await bcrypt.compare(password, user.password_hash)) ? "passed" : "failed: password did not match";
}

async function verifyOptionalDmsLogin(email: string | undefined, password: string | undefined) {
  if (!email || !password) return "skipped: DMS_TEST_EMAIL and DMS_TEST_PASSWORD were not both set";

  const rows = smartJson<Array<{ email: string; password_hash: string }>>(
    `SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
FROM (
  SELECT email, password_hash
  FROM dms_users
  WHERE lower(email) = lower(${sqlLiteral(email)})
  LIMIT 1
) t;`,
  );
  const user = rows[0];
  if (!user) return "failed: DMS user not found in smart_cp";
  return (await bcrypt.compare(password, user.password_hash)) ? "passed" : "failed: password did not match";
}

function printSafeUserList(label: string, rows: SafeUser[]) {
  console.log(label);
  if (rows.length === 0) {
    console.log("  (none)");
    return;
  }
  for (const row of rows) {
    console.log(`  ${row.user_id} | ${row.full_name ?? ""} | ${row.email ?? ""} | ${row.role ?? ""} | ${row.status ?? ""}`);
  }
}

function printSafeDmsUserList(label: string, rows: SafeDmsUser[]) {
  console.log(label);
  if (rows.length === 0) {
    console.log("  (none)");
    return;
  }
  for (const row of rows) {
    console.log(`  ${row.id} | ${row.name ?? ""} | ${row.email} | ${row.role ?? ""}`);
  }
}

async function main() {
  requirePassword();

  const oldUsersColumns = getColumns(OLD_DATABASE, "users");
  const oldDmsUsersColumns = getColumns(OLD_DATABASE, "dms_users");
  const oldDmsProjectsColumns = getColumns(OLD_DATABASE, "dms_projects");
  const oldDmsDocumentsColumns = getColumns(OLD_DATABASE, "dms_documents");
  const newUsersColumns = getColumns(NEW_DATABASE, "users");
  const newDmsUsersColumns = getColumns(NEW_DATABASE, "dms_users");
  const newDmsProjectsColumns = getColumns(NEW_DATABASE, "dms_projects");
  const newDmsDocumentsColumns = getColumns(NEW_DATABASE, "dms_documents");

  assertColumns("smart_cp.users", newUsersColumns, [
    "user_id",
    "password_hash",
    "full_name",
    "email",
    "role",
    "status",
    "created_at",
    "updated_at",
    "last_login",
  ]);
  assertColumns("smart_cp.dms_users", newDmsUsersColumns, ["id", "name", "email", "password_hash", "role", "created_at"]);
  assertColumns("smart_cp.dms_projects", newDmsProjectsColumns, ["id", "name", "type", "description", "created_by", "created_at", "updated_at"]);
  assertColumns("smart_cp.dms_documents", newDmsDocumentsColumns, [
    "id",
    "title",
    "file_name",
    "file_path",
    "file_type",
    "file_size",
    "project_id",
    "uploaded_by",
    "created_at",
  ]);

  const oldUsers = fetchOldUsers(oldUsersColumns);
  const oldDmsUsers = fetchOldDmsUsers(oldDmsUsersColumns);
  const oldDmsProjects = fetchOldDmsProjects(oldDmsProjectsColumns);
  const oldDmsDocuments = fetchOldDmsDocuments(oldDmsDocumentsColumns);

  const incompatibleUsers = oldUsers.filter((user) => !isBcryptHash(user.password_hash));
  const incompatibleDmsUsers = oldDmsUsers.filter((user) => !isBcryptHash(user.password_hash));

  if (incompatibleUsers.length > 0 || incompatibleDmsUsers.length > 0) {
    throw new Error(
      `Migration stopped: found non-bcrypt password hash(es) in ${incompatibleUsers.length} users and ${incompatibleDmsUsers.length} dms_users row(s).`,
    );
  }

  const usersResult = migrateUsers(oldUsers);
  const dmsResult = migrateDmsUsers(oldDmsUsers);
  const dmsProjectsResult = migrateDmsProjects(oldDmsProjects);
  const dmsDocumentsResult = migrateDmsDocuments(oldDmsDocuments);
  const smartUsers = smartSafeUsers();
  const smartDmsUsers = smartSafeDmsUsers();

  const userLogin = await verifyOptionalLogin(process.env.AUTH_TEST_USER_ID, process.env.AUTH_TEST_PASSWORD);
  const dmsLogin = await verifyOptionalDmsLogin(process.env.DMS_TEST_EMAIL, process.env.DMS_TEST_PASSWORD);

  console.log("### Authentication Tables");
  console.log("cc1_app.users columns:", JSON.stringify(columnSummary(oldUsersColumns)));
  console.log("cc1_app.dms_users columns:", JSON.stringify(columnSummary(oldDmsUsersColumns)));
  console.log("cc1_app.dms_projects columns:", JSON.stringify(columnSummary(oldDmsProjectsColumns)));
  console.log("cc1_app.dms_documents columns:", JSON.stringify(columnSummary(oldDmsDocumentsColumns)));
  console.log("smart_cp.users columns:", JSON.stringify(columnSummary(newUsersColumns)));
  console.log("smart_cp.dms_users columns:", JSON.stringify(columnSummary(newDmsUsersColumns)));
  console.log("smart_cp.dms_projects columns:", JSON.stringify(columnSummary(newDmsProjectsColumns)));
  console.log("smart_cp.dms_documents columns:", JSON.stringify(columnSummary(newDmsDocumentsColumns)));

  console.log("\n### Users Found");
  console.log(`cc1_app.users: ${oldUsers.length}`);
  printSafeUserList("cc1_app.users safe fields:", oldUsers);
  console.log(`cc1_app.dms_users: ${oldDmsUsers.length}`);
  printSafeDmsUserList("cc1_app.dms_users safe fields:", oldDmsUsers);
  console.log(`cc1_app.dms_projects: ${oldDmsProjects.length}`);
  console.log(`cc1_app.dms_documents: ${oldDmsDocuments.length}`);
  console.log(`smart_cp.users after migration: ${smartUsers.length}`);
  console.log(`smart_cp.dms_users after migration: ${smartDmsUsers.length}`);
  console.log(`smart_cp.dms_projects after migration: ${smartJson<Array<unknown>>("SELECT COALESCE(json_agg(id), '[]'::json) FROM dms_projects;").length}`);
  console.log(`smart_cp.dms_documents after migration: ${smartJson<Array<unknown>>("SELECT COALESCE(json_agg(id), '[]'::json) FROM dms_documents;").length}`);

  console.log("\n### Migration");
  console.log(`users migrated: ${usersResult.migrated.length}${usersResult.migrated.length ? ` (${usersResult.migrated.join(", ")})` : ""}`);
  console.log(`users skipped existing: ${usersResult.skippedExisting.length}${usersResult.skippedExisting.length ? ` (${usersResult.skippedExisting.join(", ")})` : ""}`);
  console.log(`dms_users migrated: ${dmsResult.migrated.length}${dmsResult.migrated.length ? ` (${dmsResult.migrated.join(", ")})` : ""}`);
  console.log(`dms_users skipped existing: ${dmsResult.skippedExisting.length}${dmsResult.skippedExisting.length ? ` (${dmsResult.skippedExisting.join(", ")})` : ""}`);
  console.log(`dms_projects migrated: ${dmsProjectsResult.migrated.length}${dmsProjectsResult.migrated.length ? ` (${dmsProjectsResult.migrated.join(", ")})` : ""}`);
  console.log(`dms_projects skipped existing: ${dmsProjectsResult.skippedExisting.length}${dmsProjectsResult.skippedExisting.length ? ` (${dmsProjectsResult.skippedExisting.join(", ")})` : ""}`);
  console.log(`dms_documents migrated: ${dmsDocumentsResult.migrated.length}${dmsDocumentsResult.migrated.length ? ` (${dmsDocumentsResult.migrated.join(", ")})` : ""}`);
  console.log(`dms_documents skipped existing: ${dmsDocumentsResult.skippedExisting.length}${dmsDocumentsResult.skippedExisting.length ? ` (${dmsDocumentsResult.skippedExisting.join(", ")})` : ""}`);
  console.log(`dms_documents skipped missing references: ${dmsDocumentsResult.skippedMissingRefs.length}${dmsDocumentsResult.skippedMissingRefs.length ? ` (${dmsDocumentsResult.skippedMissingRefs.join(", ")})` : ""}`);

  console.log("\n### Password Compatibility");
  console.log("All migrated authentication rows use bcrypt-compatible hashes.");

  console.log("\n### Login Verification");
  console.log(`Smart CP credential check: ${userLogin}`);
  console.log(`DMS credential check: ${dmsLogin}`);

  console.log("\n### smart_cp Safe Verification");
  printSafeUserList("smart_cp.users safe fields:", smartUsers);
  printSafeDmsUserList("smart_cp.dms_users safe fields:", smartDmsUsers);

  console.log("\n### Database Safety");
  console.log("cc1_app was accessed with read-only psql transactions.");
  console.log("smart_cp was updated only with missing authentication and DMS records.");
  console.log("No password hashes, plaintext passwords, JWT secrets, or API keys were printed.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
