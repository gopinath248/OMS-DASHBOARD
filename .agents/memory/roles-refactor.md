---
name: Roles Refactor
description: Replacing engineering departments with Role field across smart-cp
---

# Departments → Role Refactor

## Role values
- **Students (interns)**: "Intern" or "Trainee" 
- **Staff**: "Mentor", "Project Lead", "Manager", "HR", "Employee", "Coordinator", "Admin"

## Full role list for dropdowns
`["Intern", "Trainee", "Employee", "HR", "Manager", "Admin", "Mentor", "Project Lead", "Coordinator"]`

## Files changed
- `mockData.ts`: `department: "X"` → `role: "Y"` for all 20 students + 10 staff
- `StudentManagement.tsx`: DESIGNATIONS → ROLES, `s.department` → `s.role`
- `StaffManagement.tsx`: DESIGNATIONS_LIST → ROLES_LIST, `s.department` → `s.role`
- `Reports.tsx`: DEPTS → ROLES (Intern/Trainee only), grouping by `s.role`
- `AdminDashboard.tsx`: department pie → role-based pie
- `StudentProfile.tsx`, `StaffProfile.tsx`, `PerformanceManagement.tsx`, `SalaryManagement.tsx`, `Commands.tsx`, `HelpCenter.tsx`, `ProjectDetail.tsx`, `StaffDashboard.tsx`

## Why
Business requirement: remove engineering department labels (CSE, AI&DS, IT, ECE, EEE) and replace with role-based classification that reflects actual org roles.
