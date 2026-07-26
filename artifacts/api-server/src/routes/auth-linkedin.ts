/**
 * LinkedIn OIDC auth routes.
 *
 * GET  /api/auth/linkedin              — start OAuth flow
 * GET  /api/auth/linkedin/callback     — handle redirect, upsert member, issue JWT
 *
 * Web:    sets httpOnly cookie + CSRF cookie, redirects to site root
 * Mobile: redirects to exp:// deep link with token in fragment (stored in SecureStore)
 */
import { Router, type IRouter } from "express";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db, membersTable, registrationsTable } from "@workspace/db";
import {
  signMemberToken,
  setMemberCookies,
} from "../middleware/memberAuth.js";

const router: IRouter = Router();

// ── State store ────────────────────────────────────────────────────────────────
interface StateEntry { expiry: number; platform: "web" | "mobile" }
const pendingStates = new Map<string, StateEntry>();
const STATE_TTL_MS  = 10 * 60 * 1000;

function cleanStates() {
  const now = Date.now();
  for (const [k, v] of pendingStates) if (v.expiry < now) pendingStates.delete(k);
}

// ── URL helpers ────────────────────────────────────────────────────────────────
function callbackUrl(): string {
  if (process.env.LINKEDIN_REDIRECT_URI) return process.env.LINKEDIN_REDIRECT_URI;
  const host = process.env.REPLIT_DOMAINS?.split(",")[0];
  return `https://${host ?? "localhost"}/api/auth/linkedin/callback`;
}

function siteOrigin(): string {
  const cb = callbackUrl();
  try { return new URL(cb).origin; } catch { return "https://localhost"; }
}

// ── GET /api/auth/linkedin — start OAuth flow ──────────────────────────────────
router.get("/auth/linkedin", (req, res): void => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    res.status(503).send("LinkedIn OAuth not configured.");
    return;
  }

  const platform = req.query.platform === "mobile" ? "mobile" : "web";

  cleanStates();
  const state = randomBytes(16).toString("hex");
  // Embed platform in state value — prefix before the random part
  const stateParam = `${platform}:${state}`;
  pendingStates.set(stateParam, { expiry: Date.now() + STATE_TTL_MS, platform });

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     clientId,
    redirect_uri:  callbackUrl(),
    state:         stateParam,
    scope:         "openid profile email",
  });

  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
});

// ── GET /api/auth/linkedin/callback ───────────────────────────────────────────
router.get("/auth/linkedin/callback", async (req, res): Promise<void> => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error || !code) {
    const p = new URLSearchParams({ li_err: error ?? "no_code" });
    res.redirect(`${siteOrigin()}/?${p}`);
    return;
  }

  const entry = state ? pendingStates.get(state) : undefined;
  if (!entry || entry.expiry < Date.now()) {
    const p = new URLSearchParams({ li_err: "invalid_state" });
    res.redirect(`${siteOrigin()}/?${p}`);
    return;
  }
  pendingStates.delete(state);

  const { platform } = entry;
  const clientId     = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const p = new URLSearchParams({ li_err: "not_configured" });
    res.redirect(`${siteOrigin()}/?${p}`);
    return;
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({
        grant_type:    "authorization_code",
        code,
        redirect_uri:  callbackUrl(),
        client_id:     clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) throw new Error(`Token exchange failed (${tokenRes.status})`);
    const { access_token } = await tokenRes.json() as { access_token: string };

    // 2. Fetch OIDC userinfo
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) throw new Error(`Profile fetch failed (${profileRes.status})`);

    const profile = await profileRes.json() as {
      sub:          string;
      name?:        string;
      given_name?:  string;
      family_name?: string;
      email?:       string;
    };

    const linkedinSub = profile.sub;
    const name = profile.name
      ?? ([profile.given_name, profile.family_name].filter(Boolean).join(" ") || "P³ Member");
    const email = profile.email ?? "";

    // 3. Upsert member record — keyed on linkedin_sub (stable across email changes)
    let member = (await db.select().from(membersTable).where(eq(membersTable.linkedinSub, linkedinSub)))[0];

    if (!member) {
      // Try to find by email (existing pre-account registration)
      const byEmail = (await db.select().from(membersTable).where(eq(membersTable.email, email)))[0];

      if (byEmail) {
        // Link the linkedin_sub to the existing member row
        [member] = await db
          .update(membersTable)
          .set({ linkedinSub, name })
          .where(eq(membersTable.id, byEmail.id))
          .returning();
      } else {
        // Create new member
        const now = new Date();
        [member] = await db
          .insert(membersTable)
          .values({
            email: email || `li-${linkedinSub}@p3.invalid`,
            name,
            linkedinSub,
            // Consent for event operations — member authenticated via LinkedIn
            consentEventsAt: now,
          })
          .returning();
      }
    }

    // 4. Auto-link registration if same email (and not already linked)
    if (email) {
      const reg = (await db.select().from(registrationsTable).where(eq(registrationsTable.email, email.toLowerCase())))[0];
      if (reg && !reg.memberId) {
        await db.update(registrationsTable).set({ memberId: member.id }).where(eq(registrationsTable.id, reg.id));
      }
    }

    // 5. Issue member JWT
    const token = signMemberToken({ sub: member.id, email: member.email, name: member.name });

    // 6. Return token — web via httpOnly cookie; mobile via deep-link
    if (platform === "mobile") {
      // Mobile app opens OAuth in browser; deep-link back with token
      // App registers exp://auth as a scheme handler
      res.redirect(`exp://auth?token=${encodeURIComponent(token)}&name=${encodeURIComponent(member.name)}&email=${encodeURIComponent(member.email)}`);
    } else {
      setMemberCookies(res, token);
      res.redirect(`${siteOrigin()}/?li_ok=1`);
    }
  } catch (err) {
    console.error("[linkedin-auth] OAuth error:", err);
    const p = new URLSearchParams({ li_err: "oauth_failed" });
    res.redirect(`${siteOrigin()}/?${p}`);
  }
});

export default router;
