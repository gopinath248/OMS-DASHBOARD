import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { emitToUser } from "../lib/realtime";

const router: IRouter = Router();

// Persist notification read state using the existing notifications.read_at column.
// PostgreSQL remains the single source of truth for read/unread state.
router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "A valid notification id is required." });
      return;
    }

    const result = await pool.query<{ id: number }>(`
      UPDATE notifications
      SET read_at = COALESCE(read_at, NOW())
      WHERE id = $1
        AND (user_id IS NULL OR user_id = $2)
      RETURNING id
    `, [id, req.authUser!.userId]);

    if (!result.rowCount) {
      res.status(404).json({ error: "Notification not found." });
      return;
    }

    res.status(204).send();
  } catch (error) {
    req.log?.error({ err: error }, "Notification read update failed");
    res.status(503).json({ error: "Unable to update notification." });
  }
});

// Mark every currently-unread notification for the current user as read.
router.patch("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  try {
    const result = await pool.query(`
      UPDATE notifications
      SET read_at = COALESCE(read_at, NOW())
      WHERE read_at IS NULL
        AND (user_id IS NULL OR user_id = $1)
    `, [req.authUser!.userId]);

    res.status(204).send();
  } catch (error) {
    req.log?.error({ err: error }, "Notification read-all update failed");
    res.status(503).json({ error: "Unable to update notifications." });
  }
});

router.delete("/notifications/:id", requireAuth, async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "A valid notification id is required." });
      return;
    }

    const result = await pool.query<{ id: number; user_id: string | null }>(`
      DELETE FROM notifications
      WHERE id = $1
        AND (user_id IS NULL OR user_id = $2)
      RETURNING id, user_id
    `, [id, req.authUser!.userId]);

    if (!result.rowCount) {
      res.status(404).json({ error: "Notification not found." });
      return;
    }

    emitToUser(req.authUser!.userId, "notification_deleted", { id: String(id) });
    res.status(204).send();
  } catch (error) {
    req.log?.error({ err: error }, "Notification delete failed");
    res.status(503).json({ error: "Unable to delete notification." });
  }
});

export default router;
