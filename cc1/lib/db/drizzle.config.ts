import { defineConfig } from "drizzle-kit";
import path from "path";
import { buildConnectionString } from "./src/connection-string";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: buildConnectionString(),
  },
});
