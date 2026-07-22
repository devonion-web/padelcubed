import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

const FROM = process.env.EMAIL_FROM ?? "P³ <onboarding@resend.dev>";

export interface WalkinEmailParams {
  to: string;
  name: string;
  eventTitle: string;
  eventDate: string;   // e.g. "Thursday 6 August 2026"
  eventTime: string;   // e.g. "6:30 pm – 9:30 pm"
  eventVenue: string;
  eventLocation: string;
}

export async function sendWalkinConfirmation(params: WalkinEmailParams): Promise<void> {
  const { to, name, eventTitle, eventDate, eventTime, eventVenue, eventLocation } = params;

  const firstName = name.split(" ")[0];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're registered — ${eventTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#0a2540;padding:32px 40px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
              P<sup style="font-size:13px;">3</sup> &nbsp;·&nbsp; The Padel Exchange
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#0ea5e9;text-transform:uppercase;letter-spacing:0.8px;">You're in</p>
            <h1 style="margin:0 0 24px;font-size:26px;font-weight:700;color:#0a2540;line-height:1.2;">
              ${eventTitle}
            </h1>

            <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
              Hi ${firstName}, you've been registered for <strong>${eventTitle}</strong>. See you on court!
            </p>

            <!-- Event details card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:0 0 28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#6b7280;width:90px;">📅 Date</td>
                      <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500;">${eventDate}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#6b7280;">🕖 Time</td>
                      <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500;">${eventTime}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#6b7280;">📍 Venue</td>
                      <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500;">${eventVenue}, ${eventLocation}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
              Questions? Just reply to this email and we'll get back to you.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
              The Padel Exchange &nbsp;·&nbsp; London
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const response = await connectors.proxy("resend", "/emails", {
    method: "POST",
    body: JSON.stringify({
      from: FROM,
      to,
      subject: `You're registered — ${eventTitle}`,
      html,
    }),
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`[email] Resend error ${response.status}: ${body}`);
    // Don't throw — email failure should not break the walk-in creation
  } else {
    const body = await response.json() as { id?: string };
    console.log(`[email] Sent walk-in confirmation to ${to} (id: ${body.id})`);
  }
}
