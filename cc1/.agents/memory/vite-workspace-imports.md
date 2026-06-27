---
name: Vite workspace import resolution in DMS
description: Using relative paths like ../lib/auth fails in Vite; use the @ alias instead.
---

## Rule
Always import from `src/lib/*` using the `@` path alias (e.g. `@/lib/auth`, `@/lib/utils`), never with relative paths like `../lib/auth` or `../../lib/auth`.

**Why:** Vite's `vite:import-analysis` plugin fails to resolve relative paths that cross directory levels when the target module itself imports from a workspace package (`@workspace/api-client-react`). The cascade manifests as "Cannot find module '../lib/auth'" even though the file exists. Using the `@` alias (configured as `"@": path.resolve(import.meta.dirname, "src")` in vite.config.ts) bypasses this entirely.

**How to apply:** In any DMS page or layout component, replace `../lib/auth` → `@/lib/auth`, `../../lib/auth` → `@/lib/auth`, `../lib/utils` → `@/lib/utils`, etc. The `@` alias is already configured in `artifacts/dms/vite.config.ts`.
