import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sender address. Must be from a domain verified in your Resend account.
 * Example: "P³ <hello@yourdomain.com>"
 * Falls back to onboarding@resend.dev for local testing (Resend account owner only).
 */
const FROM = process.env.EMAIL_FROM ?? "P³ <onboarding@resend.dev>";

export interface WalkinEmailParams {
  to: string;
  name: string;
  eventTitle: string;
  eventDate: string;   // e.g. "Thursday 24 July 2026"
  eventTime: string;   // e.g. "6:30pm – 9:00pm"
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
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);max-width:560px;">

        <!-- Header bar -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a2540 0%,#0f3460 100%);padding:32px 40px 28px;">
            <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.4px;">
              P<sup style="font-size:12px;font-weight:700;">3</sup>&nbsp;&nbsp;The Padel Exchange
            </p>
            <p style="margin:0;font-size:12px;color:#94a3b8;letter-spacing:0.6px;text-transform:uppercase;">Walk-in Registration</p>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="padding:36px 40px 0;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#0ea5e9;text-transform:uppercase;letter-spacing:1px;">You're in ✅</p>
            <h1 style="margin:0 0 16px;font-size:28px;font-weight:800;color:#0a2540;line-height:1.15;letter-spacing:-0.5px;">
              ${eventTitle}
            </h1>
            <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.65;">
              Hi ${firstName}, you're confirmed for <strong style="color:#0a2540;">${eventTitle}</strong>. We've saved your spot — see you on court!
            </p>
          </td>
        </tr>

        <!-- Event detail card -->
        <tr>
          <td style="padding:0 40px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:6px 0 2px;text-align:center;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;padding:16px 24px 0;">Event Details</p>
                </td>
              </tr>
              <tr>
                <td style="padding:4px 24px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:10px 0 10px;border-bottom:1px solid #f1f5f9;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="28" style="vertical-align:top;padding-top:1px;font-size:16px;">📅</td>
                            <td>
                              <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Date</p>
                              <p style="margin:2px 0 0;font-size:14px;color:#0a2540;font-weight:600;">${eventDate}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0 10px;border-bottom:1px solid #f1f5f9;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="28" style="vertical-align:top;padding-top:1px;font-size:16px;">🕖</td>
                            <td>
                              <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Time</p>
                              <p style="margin:2px 0 0;font-size:14px;color:#0a2540;font-weight:600;">${eventTime}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 0 0;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="28" style="vertical-align:top;padding-top:1px;font-size:16px;">📍</td>
                            <td>
                              <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px;font-weight:600;">Venue</p>
                              <p style="margin:2px 0 0;font-size:14px;color:#0a2540;font-weight:600;">${eventVenue}</p>
                              <p style="margin:2px 0 0;font-size:13px;color:#64748b;">${eventLocation}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- What to bring -->
        <tr>
          <td style="padding:0 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border-radius:10px;">
              <tr>
                <td style="padding:16px 20px;">
                  <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#0ea5e9;text-transform:uppercase;letter-spacing:0.7px;">🎾 What to bring</p>
                  <p style="margin:0;font-size:13px;color:#334155;line-height:1.6;">
                    Your racket, appropriate court shoes, and plenty of energy. 
                    Water and refreshments will be available.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Reply CTA -->
        <tr>
          <td style="padding:0 40px 32px;">
            <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;">
              Got questions or need to cancel? Just reply to this email and we'll sort it out.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
              © 2026 The Padel Exchange &nbsp;·&nbsp; London
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `You're registered — ${eventTitle}`,
    html,
  });

  if (error) {
    console.error(`[email] Resend error:`, error);
    // Don't throw — email failure should not break walk-in creation
  } else {
    console.log(`[email] Sent walk-in confirmation to ${to}`);
  }
}
