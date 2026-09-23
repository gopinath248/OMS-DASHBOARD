import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { buildConnectionString } from "./connection-string";

const { Pool } = pg;

export const pool = new Pool({ connectionString: buildConnectionString() });
export const db = drizzle(pool, { schema });

export * from "./schema";
export * from "./init";
export * from "./connection-string";
