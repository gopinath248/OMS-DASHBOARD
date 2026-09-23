import { z } from "zod/v4";

export const UserRoleSchema = z.enum(["ADMIN", "EMPLOYEE", "INTERN", "HR", "MANAGER"]);
export const UserStatusSchema = z.enum(["Active", "Inactive"]);

export const LoginBody = z.object({
  userId: z.string().trim().min(1),
  password: z.string().min(1),
});

export const AuthUserResponse = z.object({
  userId: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  createdAt: z.string(),
  lastLogin: z.string().nullable(),
});

export const LoginResponse = z.object({
  token: z.string(),
  user: AuthUserResponse,
});

export type LoginBody = z.infer<typeof LoginBody>;
export type AuthUserResponse = z.infer<typeof AuthUserResponse>;
export type LoginResponse = z.infer<typeof LoginResponse>;
