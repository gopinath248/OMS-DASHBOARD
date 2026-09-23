import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getConnectionTarget, pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health", async (_req, res): Promise<void> => {
  const target = getConnectionTarget();

  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected", target });
  } catch {
    res.status(503).json({ status: "error", database: "disconnected", target });
  }
});

export default router;
