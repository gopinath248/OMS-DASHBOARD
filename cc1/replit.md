# Code Core IMS Portal

An Intern Management Suite for Code Core Global Hi-Tech Solutions. Manages the full internship lifecycle — onboarding, task tracking, leave requests, shift scheduling, performance evaluation, and reporting — across three roles: Admin, Staff, and Student.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

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

- Frontend-only with mock data — all state lives in `mockData.ts` and local React state. No backend required.
- Role-based routing: login sets role in `localStorage` as `userRole`; `App.tsx` switches between admin/staff/student layouts.
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

- App is frontend-only (no backend). All data mutations are local state only and reset on refresh.
- Login credentials are cosmetic — any input works, role is selected via dropdown.
- `framer-motion`, `recharts`, `wouter`, `react-day-picker`, `next-themes`, `react-hook-form`, `cmdk`, `sonner`, `vaul`, `react-icons` are all added to smart-cp's `package.json` as devDependencies.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
