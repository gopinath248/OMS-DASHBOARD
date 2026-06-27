import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, dmsUsersTable } from "@workspace/db";
import { DmsLoginBody } from "@workspace/api-zod";
import { signDmsToken, requireDmsAuth } from "../../middlewares/dmsAuth";

const router: IRouter = Router();

router.post("/dms/auth/login", async (req, res): Promise<void> => {
  const parsed = DmsLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(dmsUsersTable).where(eq(dmsUsersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signDmsToken({ userId: user.id, email: user.email, role: user.role });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.get("/dms/auth/me", requireDmsAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(dmsUsersTable).where(eq(dmsUsersTable.id, req.dmsUser!.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
