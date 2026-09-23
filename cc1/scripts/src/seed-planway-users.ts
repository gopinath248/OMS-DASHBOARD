import bcrypt from "bcryptjs";
import { db, pool, usersTable, type UserRole } from "@workspace/db";
import { initializeDatabase } from "@workspace/db";

const PASSWORD_POLICY_MESSAGE =
  "ADMIN_PASSWORD must be at least 8 characters and include uppercase, lowercase, number, and special character.";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function assertStrongPassword(password: string) {
  const strong =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  if (!strong) throw new Error(PASSWORD_POLICY_MESSAGE);
}

async function main() {
  await initializeDatabase();

  const userId = requireEnv("ADMIN_USERNAME").toUpperCase();
  const password = requireEnv("ADMIN_PASSWORD");
  const fullName = process.env.ADMIN_FULL_NAME?.trim() || "Planway Administrator";
  const email = process.env.ADMIN_EMAIL?.trim() || `${userId.toLowerCase()}@planway.local`;
  const role: UserRole = "ADMIN";
  const now = new Date();

  assertStrongPassword(password);

  const passwordHash = await bcrypt.hash(password, 12);
  await db
    .insert(usersTable)
    .values({
      userId,
      passwordHash,
      fullName,
      email,
      role,
      status: "Active",
    })
    .onConflictDoUpdate({
      target: usersTable.userId,
      set: {
        passwordHash,
        fullName,
        email,
        role,
        status: "Active",
        updatedAt: now,
      },
    });

  console.log("Initial Planway admin is ready:", { userId, fullName, email, role, status: "Active" });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
