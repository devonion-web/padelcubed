import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AdminJwtPayload {
  sub: number;
  email: string;
  name: string;
  role: "superadmin" | "admin";
}

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not set");
  return s;
}

export function signAdminToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "30d" });
}

export function verifyAdminToken(token: string): AdminJwtPayload {
  return jwt.verify(token, getSecret()) as AdminJwtPayload;
}

/** Attaches req.adminUser if a valid Bearer token is present; else 401. */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }
  try {
    (req as Request & { adminUser: AdminJwtPayload }).adminUser =
      verifyAdminToken(auth.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
