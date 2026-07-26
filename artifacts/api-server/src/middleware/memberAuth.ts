import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { createHmac } from "crypto";

export interface MemberJwtPayload {
  iss: "p3-member";
  sub: number;      // members.id
  email: string;
  name: string;
}

const COOKIE_NAME = "p3_member_token";
const CSRF_COOKIE = "p3_csrf";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not set");
  return s;
}

export function signMemberToken(payload: Omit<MemberJwtPayload, "iss">): string {
  return jwt.sign({ iss: "p3-member", ...payload }, getSecret(), {
    expiresIn: "30d",
  });
}

export function verifyMemberToken(token: string): MemberJwtPayload {
  const p = jwt.verify(token, getSecret()) as unknown as MemberJwtPayload;
  if (p.iss !== "p3-member") throw new Error("Wrong token issuer");
  return p;
}

/** Generate a CSRF token derived from the member JWT (stateless double-submit). */
function csrfToken(jwt: string): string {
  return createHmac("sha256", getSecret()).update(jwt).digest("hex").slice(0, 32);
}

/** Set the member httpOnly cookie + readable CSRF cookie on the response. */
export function setMemberCookies(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === "production";
  const cookieOpts = {
    httpOnly: false as boolean,
    secure: isProd,
    sameSite: "lax" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  };

  res.cookie(COOKIE_NAME, token, { ...cookieOpts, httpOnly: true });
  res.cookie(CSRF_COOKIE, csrfToken(token), {
    ...cookieOpts,
    httpOnly: false, // Readable by JS for double-submit header
  });
}

/** Clear member cookies (logout / deletion). */
export function clearMemberCookies(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.clearCookie(CSRF_COOKIE, { path: "/" });
}

/** Extract a member token from Bearer header OR httpOnly cookie. */
function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookies = (req as any).cookies as Record<string, string> | undefined;
  return cookies?.[COOKIE_NAME] ?? null;
}

/** Validate the CSRF double-submit header for state-changing cookie-authed requests. */
function validateCsrf(req: Request, token: string): boolean {
  // Bearer-authed (mobile) requests skip CSRF
  if (req.headers.authorization?.startsWith("Bearer ")) return true;
  const submitted = req.headers["x-csrf-token"] as string | undefined;
  if (!submitted) return false;
  return submitted === csrfToken(token);
}

/** Middleware: require authenticated member (cookie or Bearer). Attaches req.member. */
export function requireMember(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const payload = verifyMemberToken(token);
    (req as any).member = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

/** Middleware: require CSRF header for mutation endpoints using cookie auth. */
export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: "Not authenticated" }); return; }
  if (!validateCsrf(req, token)) {
    res.status(403).json({ error: "Invalid CSRF token" });
    return;
  }
  next();
}

/** Optional member auth — attaches req.member if present but doesn't reject. */
export function optionalMember(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      (req as any).member = verifyMemberToken(token);
    } catch { /* ignore */ }
  }
  next();
}
