/**
 * Admin auth routes
 *
 * POST /admin/auth/login        — email + password → JWT
 * GET  /admin/auth/me           — validate token, return current user
 * POST /admin/auth/users        — create admin user (superadmin JWT or master password)
 * GET  /admin/auth/users        — list admin users (superadmin only)
 * DELETE /admin/auth/users/:id  — remove admin user (superadmin only)
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { eq, and, gt, isNull } from "drizzle-orm";
import { db, adminUsersTable, passwordResetsTable } from "@workspace/db";
import { sendPasswordResetEmail } from "../email.js";
import {
  requireAdmin,
  signAdminToken,
  verifyAdminToken,
  type AdminJwtPayload,
} from "../middleware/adminAuth.js";

const router = Router();

// ─── Rate limiter: max 10 login attempts per 15 min per IP ───────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts — please try again in 15 minutes" },
});

// ─── POST /admin/auth/login ──────────────────────────────────────────────────

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/admin/auth/login", loginLimiter, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const { email, password } = parsed.data;

  try {
    const [user] = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.email, email.toLowerCase().trim()));

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const payload: AdminJwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "superadmin" | "admin",
    };

    res.json({
      token: signAdminToken(payload),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ─── GET /admin/auth/me ───────────────────────────────────────────────────────

router.get("/admin/auth/me", requireAdmin, (req, res): void => {
  const { sub, email, name, role } = (req as any).adminUser as AdminJwtPayload;
  res.json({ id: sub, email, name, role });
});

// ─── POST /admin/auth/users ───────────────────────────────────────────────────
// Requires superadmin JWT  OR  the ADMIN_PASSWORD master key (for bootstrapping).

const CreateUserBody = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1),
  role: z.enum(["superadmin", "admin"]).default("admin"),
  masterPassword: z.string().optional(),
});

router.post("/admin/auth/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
    return;
  }

  const { email, password, name, role, masterPassword } = parsed.data;

  // Authorise: valid superadmin JWT  OR  master password
  let authorised = false;
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) {
    try {
      const p = verifyAdminToken(auth.slice(7));
      if (p.role === "superadmin") authorised = true;
    } catch {}
  }
  if (
    !authorised &&
    masterPassword &&
    process.env.ADMIN_PASSWORD &&
    masterPassword === process.env.ADMIN_PASSWORD
  ) {
    authorised = true;
  }

  if (!authorised) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(adminUsersTable)
      .values({ email: email.toLowerCase().trim(), passwordHash: hash, name, role })
      .returning();

    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "An admin with that email already exists" });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// ─── GET /admin/auth/users ────────────────────────────────────────────────────

router.get("/admin/auth/users", requireAdmin, async (req, res): Promise<void> => {
  const caller = (req as any).adminUser as AdminJwtPayload;
  if (caller.role !== "superadmin") {
    res.status(403).json({ error: "Superadmin only" });
    return;
  }
  try {
    const users = await db
      .select({
        id: adminUsersTable.id,
        email: adminUsersTable.email,
        name: adminUsersTable.name,
        role: adminUsersTable.role,
        createdAt: adminUsersTable.createdAt,
      })
      .from(adminUsersTable)
      .orderBy(adminUsersTable.id);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list users" });
  }
});

// ─── DELETE /admin/auth/users/:id ────────────────────────────────────────────

router.delete("/admin/auth/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const caller = (req as any).adminUser as AdminJwtPayload;
  if (caller.role !== "superadmin") {
    res.status(403).json({ error: "Superadmin only" });
    return;
  }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id === caller.sub) {
    res.status(400).json({ error: "Cannot delete yourself" });
    return;
  }

  try {
    await db.delete(adminUsersTable).where(eq(adminUsersTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ─── POST /admin/auth/forgot-password ────────────────────────────────────────
// Generates a 6-digit reset code valid for 30 minutes.
// The code is logged server-side — a superadmin retrieves it from logs.

router.post("/admin/auth/forgot-password", async (req, res): Promise<void> => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Valid email required" });
    return;
  }

  const email = parsed.data.email.toLowerCase().trim();

  // Always return the same message regardless of whether the email exists
  // (prevents user enumeration)
  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, email));

  if (user) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    // Invalidate any existing unused codes for this user
    await db
      .delete(passwordResetsTable)
      .where(
        and(
          eq(passwordResetsTable.adminUserId, user.id),
          isNull(passwordResetsTable.usedAt)
        )
      );

    await db.insert(passwordResetsTable).values({
      adminUserId: user.id,
      code,
      expiresAt,
    });

    // Log as backup so a superadmin can retrieve it from server logs
    console.log(
      `\n🔑  PASSWORD RESET CODE for ${email}: ${code}  (expires in 30 min)\n`
    );

    // Send the code by email
    sendPasswordResetEmail({ to: email, name: user.name, code }).catch(
      (err) => console.error("[email] Password reset email failed:", err)
    );
  }

  res.json({
    message:
      "If that email is registered, a reset code has been generated. Ask your administrator to check the server logs for the 6-digit code.",
  });
});

// ─── POST /admin/auth/reset-password ─────────────────────────────────────────

const ResetPasswordBody = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

router.post("/admin/auth/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
    return;
  }

  const { email, code, newPassword } = parsed.data;

  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, email.toLowerCase().trim()));

  if (!user) {
    res.status(400).json({ error: "Invalid code or email" });
    return;
  }

  const now = new Date();
  const [reset] = await db
    .select()
    .from(passwordResetsTable)
    .where(
      and(
        eq(passwordResetsTable.adminUserId, user.id),
        eq(passwordResetsTable.code, code),
        isNull(passwordResetsTable.usedAt),
        gt(passwordResetsTable.expiresAt, now)
      )
    );

  if (!reset) {
    res.status(400).json({ error: "Invalid or expired code" });
    return;
  }

  // Mark code as used and update password
  const newHash = await bcrypt.hash(newPassword, 12);
  await Promise.all([
    db
      .update(passwordResetsTable)
      .set({ usedAt: now })
      .where(eq(passwordResetsTable.id, reset.id)),
    db
      .update(adminUsersTable)
      .set({ passwordHash: newHash })
      .where(eq(adminUsersTable.id, user.id)),
  ]);

  console.log(`✅  Password reset completed for ${email}`);
  res.json({ ok: true });
});

export default router;
