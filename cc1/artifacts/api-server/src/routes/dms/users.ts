import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, dmsUsersTable } from "@workspace/db";
import {
  DmsCreateUserBody,
  DmsUpdateUserBody,
  DmsUpdateUserParams,
  DmsDeleteUserParams,
} from "@workspace/api-zod";
import { requireDmsAuth, requireDmsAdmin } from "../../middlewares/dmsAuth";

const router: IRouter = Router();

function formatUser(user: typeof dmsUsersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/dms/users", requireDmsAuth, requireDmsAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(dmsUsersTable).orderBy(dmsUsersTable.createdAt);
  res.json(users.map(formatUser));
});

router.post("/dms/users", requireDmsAuth, requireDmsAdmin, async (req, res): Promise<void> => {
  const parsed = DmsCreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email, password, role } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db.insert(dmsUsersTable).values({ name, email, passwordHash, role }).returning();
  res.status(201).json(formatUser(user));
});

router.patch("/dms/users/:id", requireDmsAuth, requireDmsAdmin, async (req, res): Promise<void> => {
  const params = DmsUpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = DmsUpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.update(dmsUsersTable).set(parsed.data).where(eq(dmsUsersTable.id, params.data.id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

router.delete("/dms/users/:id", requireDmsAuth, requireDmsAdmin, async (req, res): Promise<void> => {
  const params = DmsDeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db.delete(dmsUsersTable).where(eq(dmsUsersTable.id, params.data.id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
