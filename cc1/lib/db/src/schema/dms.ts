import { sql } from "drizzle-orm";
import { pgTable, serial, text, integer, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dmsRoleEnum = pgEnum("dms_role", ["admin", "staff"]);
export const userRoleEnum = pgEnum("user_role", ["ADMIN", "EMPLOYEE", "INTERN", "HR", "MANAGER"]);
export const userStatusEnum = pgEnum("user_status", ["Active", "Inactive"]);

export const usersTable = pgTable("users", {
  userId: text("user_id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull(),
  status: userStatusEnum("status").notNull().default("Active"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastLogin: timestamp("last_login", { withTimezone: true }),
}, (table) => ({
  userIdUpperIdx: uniqueIndex("users_user_id_upper_idx").on(sql`upper(${table.userId})`),
}));

export const dmsUsersTable = pgTable("dms_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: dmsRoleEnum("role").notNull().default("staff"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dmsProjectsTable = pgTable("dms_projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dmsDocumentsTable = pgTable("dms_documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  projectId: integer("project_id").notNull(),
  uploadedBy: integer("uploaded_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDmsUserSchema = createInsertSchema(dmsUsersTable).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true, updatedAt: true, lastLogin: true });
export const insertDmsProjectSchema = createInsertSchema(dmsProjectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDmsDocumentSchema = createInsertSchema(dmsDocumentsTable).omit({ id: true, createdAt: true });

export type User = typeof usersTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserRole = User["role"];
export type UserStatus = User["status"];
export type DmsUser = typeof dmsUsersTable.$inferSelect;
export type DmsProject = typeof dmsProjectsTable.$inferSelect;
export type DmsDocument = typeof dmsDocumentsTable.$inferSelect;
export type InsertDmsUser = z.infer<typeof insertDmsUserSchema>;
export type InsertDmsProject = z.infer<typeof insertDmsProjectSchema>;
export type InsertDmsDocument = z.infer<typeof insertDmsDocumentSchema>;
