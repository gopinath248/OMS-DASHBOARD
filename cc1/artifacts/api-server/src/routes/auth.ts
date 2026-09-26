import express, { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import multer from "multer";
import { LoginBody } from "@workspace/api-zod";
import { db, usersTable, type User, type UserRole } from "@workspace/db";
import { requireAuth, signAuthToken } from "../middlewares/auth";
import { markUserOffline, markUserOnline } from "../lib/realtime";

const router: IRouter = Router();
const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const avatarUploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads/avatars");
const avatarPublicPath = "/api/uploads/avatars";
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
});
const avatarUploadMiddleware = avatarUpload.single("avatar");

if (!fs.existsSync(avatarUploadsDir)) {
  fs.mkdirSync(avatarUploadsDir, { recursive: true });
}

router.use(
  "/uploads/avatars",
  express.static(avatarUploadsDir, {
    fallthrough: false,
    immutable: true,
    maxAge: "1y",
  }),
);

const INVALID_LOGIN_MESSAGE = "Invalid User ID or Password.";
const INACTIVE_ACCOUNT_MESSAGE = "Your account has been disabled. Please contact the administrator.";
const DATABASE_UNAVAILABLE_MESSAGE = "Unable to connect to the database. Please contact the administrator.";
const UNSUPPORTED_ROLE_MESSAGE = "Your account role is not supported by this application.";
const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";

function normalizeUserRole(role: unknown): UserRole | null {
  if (typeof role !== "string") return null;

  const normalized = role.trim().toUpperCase();
  switch (normalized) {
    case "ADMIN":
    case "EMPLOYEE":
    case "INTERN":
    case "HR":
    case "MANAGER":
      return normalized;
    case "TRAINEE":
    case "STUDENT":
      return "INTERN";
    default:
      return null;
  }
}

function isActiveStatus(status: unknown) {
  return typeof status === "string" && status.trim().toLowerCase() === "active";
}

function formatUser(user: User, role: UserRole) {
  return {
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    role,
    status: isActiveStatus(user.status) ? "Active" : "Inactive",
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
    lastLogin: user.lastLogin ? user.lastLogin.toISOString() : null,
  };
}

function avatarExtension(file: Express.Multer.File): ".png" | ".jpg" | ".webp" | null {
  const buffer = file.buffer;
  const mimeType = file.mimetype.toLowerCase();
  const originalExtension = path.extname(file.originalname).toLowerCase();

  const isPng =
    mimeType === "image/png" &&
    originalExtension === ".png" &&
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;
  if (isPng) return ".png";

  const isJpeg =
    (mimeType === "image/jpeg" || mimeType === "image/jpg") &&
    (originalExtension === ".jpg" || originalExtension === ".jpeg") &&
    buffer.length > 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[buffer.length - 2] === 0xff &&
    buffer[buffer.length - 1] === 0xd9;
  if (isJpeg) return ".jpg";

  const isWebp =
    mimeType === "image/webp" &&
    originalExtension === ".webp" &&
    buffer.length > 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP";
  if (isWebp) return ".webp";

  return null;
}

function localAvatarFilePath(avatarUrl: string | null | undefined) {
  if (!avatarUrl?.startsWith(`${avatarPublicPath}/`)) return null;
  const fileName = path.basename(avatarUrl);
  if (!/^[a-f0-9-]+\.(png|jpg|webp)$/i.test(fileName)) return null;

  const resolved = path.resolve(avatarUploadsDir, fileName);
  return resolved.startsWith(avatarUploadsDir) ? resolved : null;
}

function handleAvatarUpload(req: Request, res: Response, next: NextFunction) {
  avatarUploadMiddleware(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({ error: "Avatar image must be 3 MB or smaller." });
      return;
    }

    res.status(400).json({ error: "Invalid avatar upload." });
  });
}

function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: INVALID_LOGIN_MESSAGE });
    return;
  }

  const userId = parsed.data.userId.trim().toUpperCase();
  let user: User | undefined;
  try {
    [user] = await db.select().from(usersTable).where(eq(usersTable.userId, userId)).limit(1);
  } catch (error) {
    req.log?.error({ err: error }, "Planway login database lookup failed");
    res.status(503).json({ error: DATABASE_UNAVAILABLE_MESSAGE });
    return;
  }
  if (!user) {
    res.status(401).json({ error: INVALID_LOGIN_MESSAGE });
    return;
  }

  const role = normalizeUserRole(user.role);
  if (!role) {
    res.status(403).json({ error: UNSUPPORTED_ROLE_MESSAGE });
    return;
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!passwordMatches) {
    res.status(401).json({ error: INVALID_LOGIN_MESSAGE });
    return;
  }

  if (!isActiveStatus(user.status)) {
    res.status(403).json({ error: INACTIVE_ACCOUNT_MESSAGE });
    return;
  }

  const lastLogin = new Date();
  await db.update(usersTable).set({ lastLogin }).where(eq(usersTable.userId, user.userId));

  const token = signAuthToken({
    userId: user.userId,
    email: user.email,
    fullName: user.fullName,
    role,
  });
  markUserOnline(user.userId);

  res.json({
    token,
    user: formatUser({ ...user, lastLogin }, role),
  });
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  markUserOffline(req.authUser!.userId);
  res.status(204).send();
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  let user: User | undefined;
  try {
    [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.userId, req.authUser!.userId))
      .limit(1);
  } catch (error) {
    req.log?.error({ err: error }, "Planway auth/me database lookup failed");
    res.status(503).json({ error: DATABASE_UNAVAILABLE_MESSAGE });
    return;
  }

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const role = normalizeUserRole(user.role);
  if (!role) {
    res.status(403).json({ error: UNSUPPORTED_ROLE_MESSAGE });
    return;
  }

  if (!isActiveStatus(user.status)) {
    res.status(403).json({ error: INACTIVE_ACCOUNT_MESSAGE });
    return;
  }

  res.json(formatUser(user, role));
});

router.post("/auth/password", requireAuth, async (req, res): Promise<void> => {
  const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current password and new password are required." });
    return;
  }

  if (!isStrongPassword(newPassword)) {
    res.status(400).json({ error: PASSWORD_POLICY_MESSAGE });
    return;
  }

  let user: User | undefined;
  try {
    [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.userId, req.authUser!.userId))
      .limit(1);
  } catch (error) {
    req.log?.error({ err: error }, "Planway password update database lookup failed");
    res.status(503).json({ error: DATABASE_UNAVAILABLE_MESSAGE });
    return;
  }

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!passwordMatches) {
    res.status(401).json({ error: "Current password is incorrect." });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db
    .update(usersTable)
    .set({ passwordHash })
    .where(eq(usersTable.userId, user.userId));

  res.json({ ok: true });
});

router.post("/auth/avatar", requireAuth, handleAvatarUpload, async (req, res): Promise<void> => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "Avatar image is required." });
    return;
  }

  const extension = avatarExtension(file);
  if (!extension) {
    res.status(400).json({ error: "Avatar must be a valid PNG, JPG, JPEG, or WEBP image." });
    return;
  }

  await mkdir(avatarUploadsDir, { recursive: true });
  const fileName = `${crypto.randomUUID()}${extension}`;
  const absolutePath = path.resolve(avatarUploadsDir, fileName);
  const avatarUrl = `${avatarPublicPath}/${fileName}`;

  if (!absolutePath.startsWith(avatarUploadsDir)) {
    res.status(400).json({ error: "Invalid avatar filename." });
    return;
  }

  let previousAvatarUrl: string | null = null;
  try {
    const [currentUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.userId, req.authUser!.userId))
      .limit(1);

    if (!currentUser) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    previousAvatarUrl = currentUser.avatarUrl;
    await writeFile(absolutePath, file.buffer);

    const [updatedUser] = await db
      .update(usersTable)
      .set({ avatarUrl, updatedAt: new Date() })
      .where(eq(usersTable.userId, req.authUser!.userId))
      .returning();

    if (!updatedUser) {
      await unlink(absolutePath).catch(() => undefined);
      res.status(500).json({ error: "Unable to save avatar." });
      return;
    }

    const previousPath = localAvatarFilePath(previousAvatarUrl);
    if (previousPath && previousPath !== absolutePath) {
      await unlink(previousPath).catch(() => undefined);
    }

    const role = normalizeUserRole(updatedUser.role);
    if (!role) {
      res.status(403).json({ error: UNSUPPORTED_ROLE_MESSAGE });
      return;
    }

    res.json({ user: formatUser(updatedUser, role), avatarUrl });
  } catch (error) {
    await unlink(absolutePath).catch(() => undefined);
    req.log?.error({ err: error }, "Avatar upload failed");
    res.status(500).json({ error: "Unable to upload avatar." });
  }
});

router.delete("/auth/avatar", requireAuth, async (req, res): Promise<void> => {
  try {
    const [currentUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.userId, req.authUser!.userId))
      .limit(1);

    if (!currentUser) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const [updatedUser] = await db
      .update(usersTable)
      .set({ avatarUrl: null, updatedAt: new Date() })
      .where(eq(usersTable.userId, req.authUser!.userId))
      .returning();

    const previousPath = localAvatarFilePath(currentUser.avatarUrl);
    if (previousPath) await unlink(previousPath).catch(() => undefined);

    const role = normalizeUserRole(updatedUser.role);
    if (!role) {
      res.status(403).json({ error: UNSUPPORTED_ROLE_MESSAGE });
      return;
    }

    res.json({ user: formatUser(updatedUser, role), avatarUrl: null });
  } catch (error) {
    req.log?.error({ err: error }, "Avatar removal failed");
    res.status(500).json({ error: "Unable to remove avatar." });
  }
});

export default router;
