import { initializeDatabase } from "@workspace/db";

async function main() {
  const result = await initializeDatabase();
  console.log("Database initialized:", result);
}

main().catch((error: unknown) => {
  console.error("Bootstrap failed:", error);
  process.exitCode = 1;
});
