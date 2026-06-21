import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

export interface AuthPayload {
  userId: number;
  email: string;
}

export interface AdminPayload {
  admin: true;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
      req.user = payload;
    } catch {
      // Invalid token — just skip, don't block
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const adminToken = req.headers["x-admin-token"];
  if (!adminToken || typeof adminToken !== "string") {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  try {
    const payload = jwt.verify(adminToken, JWT_SECRET) as AdminPayload;
    if (payload.admin !== true) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  } catch {
    res.status(401).json({ error: "Invalid or expired admin token" });
    return;
  }
  next();
}

export { JWT_SECRET };
