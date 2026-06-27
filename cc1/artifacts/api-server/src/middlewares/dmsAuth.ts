import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET ?? "dms-dev-secret-key";

export interface DmsJwtPayload {
  userId: number;
  email: string;
  role: "admin" | "staff";
}

export function signDmsToken(payload: DmsJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function requireDmsAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as DmsJwtPayload;
    req.dmsUser = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireDmsAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.dmsUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.dmsUser.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

declare global {
  namespace Express {
    interface Request {
      dmsUser?: DmsJwtPayload;
    }
  }
}
