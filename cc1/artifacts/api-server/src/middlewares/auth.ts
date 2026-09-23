import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@workspace/db";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET or SESSION_SECRET must be set in production.");
  }

  return "planway-dev-secret-key";
}

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "8h") as jwt.SignOptions["expiresIn"];

export interface AuthJwtPayload {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export function signAuthToken(payload: AuthJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    req.authUser = jwt.verify(authHeader.slice(7), JWT_SECRET) as AuthJwtPayload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!allowedRoles.includes(req.authUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthJwtPayload;
    }
  }
}
