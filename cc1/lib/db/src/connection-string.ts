const DEFAULT_DB_HOST = "localhost";
const DEFAULT_DB_PORT = "5432";
const DEFAULT_DB_NAME = "smart_cp";
const DEFAULT_DB_USER = "postgres";

function assertConfiguredDatabase(database: string | undefined, source: string) {
  if (!database || database === DEFAULT_DB_NAME) return DEFAULT_DB_NAME;
  throw new Error(`${source} must target the ${DEFAULT_DB_NAME} database.`);
}

function validateDatabaseUrl(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  assertConfiguredDatabase(database, "DATABASE_URL");
  return databaseUrl;
}

export function buildConnectionString(env: NodeJS.ProcessEnv = process.env) {
  if (!env.DB_PASSWORD && env.DATABASE_URL) return validateDatabaseUrl(env.DATABASE_URL);

  const host = env.DB_HOST ?? DEFAULT_DB_HOST;
  const port = env.DB_PORT ?? DEFAULT_DB_PORT;
  const database = assertConfiguredDatabase(env.DB_NAME, "DB_NAME");
  const user = env.DB_USER ?? DEFAULT_DB_USER;
  const password = env.DB_PASSWORD;

  if (!password) {
    throw new Error(`Set DATABASE_URL or DB_PASSWORD for the ${DEFAULT_DB_NAME} database.`);
  }

  const credentials = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
  return `postgresql://${credentials}@${host}:${port}/${database}`;
}

export function getConnectionTarget(env: NodeJS.ProcessEnv = process.env) {
  const parsed = new URL(buildConnectionString(env));

  return {
    host: parsed.hostname,
    port: parsed.port || DEFAULT_DB_PORT,
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    user: decodeURIComponent(parsed.username),
  };
}
