# Code Core IMS Portal

An Intern Management Suite for Code Core Global Hi-Tech Solutions. Manages the full internship lifecycle — onboarding, task tracking, leave requests, shift scheduling, performance evaluation, and reporting — across three roles: Admin, Staff, and Student.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DB_PASSWORD` or `DATABASE_URL` — Postgres credentials for `smart_cp`

## CC1 database setup

1. Use the existing PostgreSQL database: `smart_cp`.
2. Copy `.env.example` to `.env` or set the same environment variables in your terminal.
3. Run the backend with `corepack pnpm run dev:backend` from `cc1/`.

Do not put real database passwords in tracked source files. Keep them in your terminal environment or an ignored `.env.local`.

To only create/update tables, run `corepack pnpm run db:init`.
To only create/update the first admin user, run `corepack pnpm run db:seed-admin`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite, wouter (routing), recharts (charts), framer-motion, shadcn/ui, Poppins font

## Where things live

- `artifacts/smart-cp/` — the full IMS React+Vite app (preview path `/`)
- `artifacts/smart-cp/src/data/mockData.ts` — source of truth for all mock data (students, staff, tasks, leaves, shifts, performance)
- `artifacts/smart-cp/src/App.tsx` — top-level routing with wouter
- `artifacts/smart-cp/src/index.css` — design tokens / Tailwind theme
- `artifacts/smart-cp/src/components/layout/` — Sidebar, Topbar, AppLayout
- `artifacts/smart-cp/src/pages/` — all 19 pages
- `artifacts/smart-cp/public/codecore-logo.jpeg` — company logo

## Architecture decisions

- React frontend calls the Express backend through the Vite `/api` proxy.
- Role-based routing: login stores the authenticated user and token in `localStorage`; protected routes validate with `/api/auth/me`.
- wouter used instead of react-router for its lightweight footprint and hook-based API.
- shadcn/ui components for consistent design system; recharts for all data visualizations.
- Theme: dark navy sidebar (`--secondary: 228 87% 20%`), blue primary (`--primary: 228 87% 30%`), light background (`--background: 220 33% 97%`), Poppins font.

## Product

- **Admin**: Dashboard with KPIs + charts, student management, staff management, leave approval, task board, shift change requests, performance radar charts, reports, calendar, notifications, settings
- **Staff**: Dashboard with their interns' overview, task tracking, leave management
- **Student**: Dashboard with personal progress, apply for leave, view tasks, profile

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Backend requires PostgreSQL credentials and connects to `smart_cp` by default.
- Login credentials are verified against the `users` table through the backend auth API.
- `framer-motion`, `recharts`, `wouter`, `react-day-picker`, `next-themes`, `react-hook-form`, `cmdk`, `sonner`, `vaul`, `react-icons` are all added to smart-cp's `package.json` as devDependencies.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
