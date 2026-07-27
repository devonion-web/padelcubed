/**
 * GET /api/unsubscribe?email=xxx&tok=xxx
 *
 * One-click unsubscribe. Sets opted_out_at on the matching member and/or
 * registration record, then returns a simple HTML confirmation page.
 *
 * Token is HMAC-SHA256(SESSION_SECRET, "unsub:" + email.toLowerCase()).
 * Generated at email-send time by email.ts and embedded in every footer.
 */
import { Router, type IRouter } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db, membersTable, registrationsTable } from "@workspace/db";

const router: IRouter = Router();

export function makeUnsubToken(email: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET ?? "")
    .update(`unsub:${email.toLowerCase()}`)
    .digest("hex");
}

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title} — P3</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#f8fafc;margin:0;min-height:100vh;
         display:flex;align-items:center;justify-content:center}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:40px;
          max-width:440px;width:100%;box-sizing:border-box;text-align:center;
          box-shadow:0 4px 24px rgba(0,0,0,.06)}
    .badge{display:inline-block;background:#f1f5f9;border-radius:8px;
           padding:8px 14px;font-size:13px;color:#64748b;margin-bottom:24px}
    h1{margin:0 0 12px;font-size:22px;color:#0f172a}
    p{margin:0 0 20px;color:#64748b;line-height:1.6;font-size:15px}
    a{color:#4169e1;text-decoration:none}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">P3 &middot; Padel Cubed</div>
    <h1>${title}</h1>
    ${body}
    <p style="margin-top:8px"><a href="https://www.padelcubed.co.uk">Back to P3</a></p>
  </div>
</body>
</html>`;
}

router.get("/unsubscribe", async (req, res): Promise<void> => {
  const { email, tok } = req.query as { email?: string; tok?: string };

  if (!email || !tok || typeof email !== "string" || typeof tok !== "string") {
    res.status(400).send(page(
      "Invalid link",
      "<p>This unsubscribe link is missing required parameters. Please use the link from your email.</p>",
    ));
    return;
  }

  // Constant-time HMAC comparison
  const expected = makeUnsubToken(email);
  let valid = false;
  try {
    const expBuf = Buffer.from(expected, "hex");
    const tokBuf = Buffer.from(tok, "hex");
    valid = expBuf.length === tokBuf.length && timingSafeEqual(expBuf, tokBuf);
  } catch { valid = false; }

  if (!valid) {
    res.status(400).send(page(
      "Invalid link",
      "<p>This unsubscribe link isn't valid. It may have been modified. Please use the original link from your email.</p>",
    ));
    return;
  }

  const now = new Date();
  const lowerEmail = email.toLowerCase();

  try {
    // Set opted_out_at on member account if one exists
    await db
      .update(membersTable)
      .set({ optedOutAt: now })
      .where(eq(membersTable.email, lowerEmail));

    // Set opted_out_at on registration record if one exists
    await db
      .update(registrationsTable)
      .set({ optedOutAt: now })
      .where(eq(registrationsTable.email, lowerEmail));

    res.send(page(
      "You've been unsubscribed",
      `<p>We've removed <strong>${email}</strong> from our mailing list. You won't receive any further emails from P3.</p>
       <p>Changed your mind? <a href="https://www.padelcubed.co.uk">Re-register at padelcubed.co.uk</a>.</p>`,
    ));
  } catch (err) {
    console.error("[unsubscribe]", err);
    res.status(500).send(page(
      "Something went wrong",
      "<p>We couldn't process your request right now. Please reply to the email you received and we'll sort it manually.</p>",
    ));
  }
});

export default router;
