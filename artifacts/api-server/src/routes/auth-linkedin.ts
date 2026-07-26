import { Router, type IRouter } from "express";
import { randomBytes } from "crypto";

const router: IRouter = Router();

// ── Simple in-memory CSRF state store ─────────────────────────────────────────
// Values are expiry timestamps. Entries are pruned lazily before each new auth.
const pendingStates = new Map<string, number>();
const STATE_TTL_MS  = 10 * 60 * 1000; // 10 minutes

function cleanStates() {
  const now = Date.now();
  for (const [k, v] of pendingStates) if (v < now) pendingStates.delete(k);
}

// ── URL helpers ────────────────────────────────────────────────────────────────
function callbackUrl(): string {
  // Explicit env var takes priority — set this to your production domain
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
    res.status(503).send("LinkedIn OAuth not configured — LINKEDIN_CLIENT_ID is missing.");
    return;
  }

  cleanStates();
  const state = randomBytes(16).toString("hex");
  pendingStates.set(state, Date.now() + STATE_TTL_MS);

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     clientId,
    redirect_uri:  callbackUrl(),
    state,
    scope:         "openid profile email",
  });

  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
});

// ── GET /api/auth/linkedin/callback — handle redirect from LinkedIn ────────────
router.get("/auth/linkedin/callback", async (req, res): Promise<void> => {
  const { code, state, error } = req.query as Record<string, string>;

  // User denied or LinkedIn returned an error
  if (error || !code) {
    const p = new URLSearchParams({ li_err: error ?? "no_code" });
    res.redirect(`${siteOrigin()}/?${p}`);
    return;
  }

  // CSRF check
  const expiry = state ? pendingStates.get(state) : undefined;
  if (!expiry || expiry < Date.now()) {
    const p = new URLSearchParams({ li_err: "invalid_state" });
    res.redirect(`${siteOrigin()}/?${p}`);
    return;
  }
  pendingStates.delete(state);

  const clientId     = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const p = new URLSearchParams({ li_err: "not_configured" });
    res.redirect(`${siteOrigin()}/?${p}`);
    return;
  }

  try {
    // 1. Exchange authorisation code for access token
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

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      throw new Error(`Token exchange failed (${tokenRes.status}): ${body}`);
    }
    const { access_token } = await tokenRes.json() as { access_token: string };

    // 2. Get profile via LinkedIn's OIDC userinfo endpoint
    //    Returns: sub, name, given_name, family_name, email, email_verified, picture
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      throw new Error(`Profile fetch failed (${profileRes.status})`);
    }

    const profile = await profileRes.json() as {
      given_name?: string;
      family_name?: string;
      name?:        string;
      email?:       string;
    };

    const name  = profile.name
      ?? [profile.given_name, profile.family_name].filter(Boolean).join(" ");
    const email = profile.email ?? "";

    // 3. Redirect back to the web app with pre-fill params
    const p = new URLSearchParams({ li_ok: "1" });
    if (name)  p.set("li_name",  name);
    if (email) p.set("li_email", email);

    res.redirect(`${siteOrigin()}/?${p}`);
  } catch (err) {
    console.error("LinkedIn OAuth error:", err);
    const p = new URLSearchParams({ li_err: "oauth_failed" });
    res.redirect(`${siteOrigin()}/?${p}`);
  }
});

export default router;
