---
name: PlanWay Jira Rewrite
description: Architecture and key lessons from the Jira-style PlanWay sprint planning rewrite
---

# PlanWay Jira-Style Sprint Planning

## What was built
Complete rewrite of `cc1/artifacts/smart-cp/src/pages/PlanWay.tsx` with 6 Jira-style tabs:
- **Summary**: sprint overview, progress bar, 4 metric tiles, recent activity
- **Backlog**: sortable/filterable/paginated table (8 rows/page)
- **Board**: Kanban drag-and-drop with 6 columns (To Do, In Progress, Review, Testing, Done, Blocked)
- **Timeline**: CSS Gantt bars with today marker (May–Sep 2026 window)
- **Reports**: Sprint velocity bar, burndown line, task status pie, ticket type bar — all via recharts
- **Documents**: searchable/filterable document list with upload/download/delete

## Architecture
- Single-file component (~700 lines) with tab sub-components receiving props
- `sprintsData` state lives in main PlanWay; BoardTab gets `onMove` callback
- "Done Story" / "Blocked Story" are internal data keys; display labels are "Done" / "Blocked"
- PLANYWAY title in gold (#D4AF37), rest in blue+white theme

## Key lesson: perl regex gotcha on mockData
When using `perl -i -pe 'if (/INT\d+/)...'` to target student lines, staff lines with non-empty `assignedInterns: ["INT001", ...]` ALSO match the `/INT\d+/` pattern. Fix: use a second pass targeting each EMP line explicitly by its `"EMP00X"` ID.
