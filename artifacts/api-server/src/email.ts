import { Resend } from "resend";
import QRCode from "qrcode";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "P³ <onboarding@resend.dev>";

// ─── Brand tokens ──────────────────────────────────────────────────────────────
const B = {
  navy:       "#0a2540",
  navyLight:  "#0f3460",
  blue:       "#2563eb",
  blueLight:  "#3b82f6",
  bluePale:   "#eff6ff",
  green:      "#059669",
  greenPale:  "#f0fdf4",
  greenBorder:"#a7f3d0",
  amber:      "#d97706",
  amberPale:  "#fffbeb",
  amberBorder:"#fde68a",
  slate:      "#64748b",
  slateLight: "#94a3b8",
  slateXLight:"#e2e8f0",
  white:      "#ffffff",
  offWhite:   "#f8fafc",
  bg:         "#f1f5f9",
} as const;

// ─── Shared base template ─────────────────────────────────────────────────────

function baseEmail(opts: {
  preheader: string;
  accentColor: string;
  accentPale: string;
  accentBorder: string;
  badgeText: string;
  badgeEmoji: string;
  subject: string;
  headline: string;
  subline: string;
  body: string;
}): string {
  const { preheader, accentColor, accentPale, accentBorder,
          badgeText, badgeEmoji, headline, subline, body } = opts;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${opts.subject}</title>
  <!--[if mso]><style>td,p,a{font-family:Arial,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${B.bg};-webkit-text-size-adjust:100%;mso-line-height-rule:exactly;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;font-size:1px;color:${B.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${preheader}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌
  </div>

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${B.bg};padding:32px 16px;">
    <tr><td align="center">

      <!-- Card -->
      <table width="600" cellpadding="0" cellspacing="0" border="0"
             style="max-width:600px;width:100%;background:${B.white};border-radius:20px;
                    overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

        <!-- Top accent stripe -->
        <tr>
          <td height="5" style="background:linear-gradient(90deg,${accentColor} 0%,${B.blueLight} 100%);font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- ═══ HEADER ═══ -->
        <tr>
          <td style="background:${B.navy};padding:28px 40px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <!-- Wordmark -->
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="background:${accentColor};border-radius:6px;padding:4px 10px 5px;vertical-align:middle;">
                        <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:900;
                                     color:${B.white};letter-spacing:-0.3px;line-height:1;">
                          P<sup style="font-size:9px;font-weight:900;vertical-align:top;line-height:1.8;">3</sup>
                        </span>
                      </td>
                      <td style="padding-left:10px;vertical-align:middle;">
                        <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;
                                     color:${B.white};letter-spacing:0.5px;">THE PADEL EXCHANGE</span>
                      </td>
                    </tr>
                  </table>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <!-- Court lines decoration -->
                  <table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="6" style="border-right:1px solid rgba(255,255,255,0.12);height:32px;">&nbsp;</td>
                      <td width="12">&nbsp;</td>
                      <td width="6" style="border-right:1px solid rgba(255,255,255,0.12);height:32px;">&nbsp;</td>
                      <td width="12">&nbsp;</td>
                      <td width="6" style="border-right:1px solid rgba(255,255,255,0.12);height:32px;">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ═══ HERO ═══ -->
        <tr>
          <td style="padding:36px 40px 0;">

            <!-- Status badge -->
            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
              <tr>
                <td style="background:${accentPale};border:1px solid ${accentBorder};
                            border-radius:100px;padding:5px 14px;">
                  <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;
                               font-weight:700;color:${accentColor};letter-spacing:0.3px;">
                    ${badgeEmoji}&nbsp;&nbsp;${badgeText}
                  </span>
                </td>
              </tr>
            </table>

            <!-- Headline -->
            <h1 style="margin:0 0 12px;font-family:'Helvetica Neue',Arial,sans-serif;
                        font-size:30px;font-weight:900;color:${B.navy};line-height:1.1;
                        letter-spacing:-0.6px;">
              ${headline}
            </h1>

            <!-- Subline -->
            <p style="margin:0 0 32px;font-family:'Helvetica Neue',Arial,sans-serif;
                       font-size:15px;color:${B.slate};line-height:1.65;">
              ${subline}
            </p>
          </td>
        </tr>

        <!-- ═══ BODY CONTENT (injected per email) ═══ -->
        ${body}

        <!-- ═══ FOOTER ═══ -->
        <tr>
          <td style="padding:0 40px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border-top:1px solid ${B.slateXLight};padding-top:24px;margin-top:8px;">
              <tr>
                <td>
                  <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;
                             font-size:11px;color:${B.slateLight};text-align:center;
                             text-transform:uppercase;letter-spacing:0.8px;font-weight:700;">
                    The Padel Exchange · London
                  </p>
                  <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;
                             font-size:11px;color:${B.slateLight};text-align:center;">
                    Questions? Reply to this email and we'll get back to you.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table><!-- /Card -->

    </td></tr>
  </table><!-- /Outer wrapper -->
</body>
</html>`;
}

// ─── Reusable blocks ──────────────────────────────────────────────────────────

function eventDetailsBlock(date: string, time: string, venue: string, location: string): string {
  const row = (icon: string, label: string, val: string, sub?: string) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${B.slateXLight};">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="36" style="vertical-align:top;padding-top:2px;">
            <div style="width:28px;height:28px;background:${B.bluePale};border-radius:8px;
                        text-align:center;line-height:28px;font-size:14px;">${icon}</div>
          </td>
          <td style="vertical-align:top;">
            <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;
                       font-weight:700;color:${B.slateLight};text-transform:uppercase;letter-spacing:0.8px;">
              ${label}
            </p>
            <p style="margin:2px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;
                       font-weight:700;color:${B.navy};">${val}</p>
            ${sub ? `<p style="margin:1px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:${B.slate};">${sub}</p>` : ''}
          </td>
        </tr></table>
      </td>
    </tr>`;

  return `
  <tr>
    <td style="padding:0 40px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background:${B.offWhite};border:1px solid ${B.slateXLight};border-radius:14px;overflow:hidden;">
        <tr><td style="padding:16px 24px 0;">
          <p style="margin:0 0 4px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;
                     color:${B.slateLight};text-transform:uppercase;letter-spacing:1px;">Event Details</p>
        </td></tr>
        <tr><td style="padding:0 24px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${row('📅', 'Date', date)}
            ${row('🕖', 'Time', time)}
            ${row('📍', 'Venue', venue, location)}
          </table>
        </td></tr>
      </table>
    </td>
  </tr>`;
}

function whatToBringBlock(): string {
  return `
  <tr>
    <td style="padding:0 40px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background:${B.bluePale};border-left:3px solid ${B.blueLight};border-radius:0 10px 10px 0;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 6px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:800;
                     color:${B.blue};text-transform:uppercase;letter-spacing:0.8px;">
            🎾&nbsp;&nbsp;What to bring
          </p>
          <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;
                     color:${B.navy};line-height:1.65;">
            Your racket, appropriate court shoes, and plenty of energy.
            Water and refreshments will be available on the day.
          </p>
        </td></tr>
      </table>
    </td>
  </tr>`;
}

function qrTicketBlock(qrDataUri: string, bookingId: number): string {
  return `
  <tr>
    <td style="padding:0 40px 32px;">
      <!-- Ticket wrapper -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background:${B.navy};border-radius:16px;overflow:hidden;">

        <!-- Ticket header -->
        <tr>
          <td style="padding:18px 24px 14px;border-bottom:2px dashed rgba(255,255,255,0.15);">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td>
                <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;
                           font-weight:800;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1.2px;">
                  Entry Ticket
                </p>
                <p style="margin:4px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;
                           font-weight:900;color:${B.white};letter-spacing:-0.2px;">
                  P³ The Padel Exchange
                </p>
              </td>
              <td align="right" style="vertical-align:top;">
                <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;
                           color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.8px;">
                  Ref
                </p>
                <p style="margin:2px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;
                           font-weight:700;color:${B.blueLight};font-variant-numeric:tabular-nums;">
                  #${String(bookingId).padStart(5, '0')}
                </p>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- QR code -->
        <tr>
          <td align="center" style="padding:24px 24px 18px;">
            <div style="display:inline-block;background:${B.white};border-radius:12px;padding:10px;">
              <img src="${qrDataUri}" width="160" height="160" alt="QR check-in code"
                   style="display:block;border-radius:6px;" />
            </div>
          </td>
        </tr>

        <!-- Ticket footer -->
        <tr>
          <td align="center" style="padding:0 24px 22px;">
            <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;
                       color:rgba(255,255,255,0.55);line-height:1.55;text-align:center;">
              Show this QR code at the door for instant check-in.<br/>
              Screenshot it so it works offline.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>`;
}

// ─── Booking confirmation ─────────────────────────────────────────────────────

export interface BookingConfirmationParams {
  to: string;
  name: string;
  eventId: string;
  bookingId: number;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  eventLocation: string;
}

export async function sendBookingConfirmation(params: BookingConfirmationParams): Promise<void> {
  const { to, name, eventId, bookingId, eventTitle, eventDate, eventTime, eventVenue, eventLocation } = params;
  const firstName = name.split(" ")[0];

  const qrPayload = Buffer.from(JSON.stringify({ v: 1, eventId, bookingId, email: to })).toString("base64");
  const qrDataUri = await QRCode.toDataURL(qrPayload, {
    width: 200,
    margin: 2,
    color: { dark: B.navy, light: B.white },
  });

  const body = `
    ${eventDetailsBlock(eventDate, eventTime, eventVenue, eventLocation)}
    ${whatToBringBlock()}
    ${qrTicketBlock(qrDataUri, bookingId)}
  `;

  const html = baseEmail({
    subject:      `You're booked — ${eventTitle}`,
    preheader:    `${firstName}, your spot at ${eventTitle} is confirmed. Your QR entry ticket is inside.`,
    accentColor:  B.green,
    accentPale:   B.greenPale,
    accentBorder: B.greenBorder,
    badgeEmoji:   '✅',
    badgeText:    'Booking Confirmed',
    headline:     eventTitle,
    subline:      `Hi ${firstName}, your spot is confirmed and ready. We can't wait to see you on court — your QR entry ticket is below.`,
    body,
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `You're booked — ${eventTitle}`,
    html,
  });

  if (error) {
    console.error(`[email] Resend error (booking confirmation):`, error);
  } else {
    console.log(`[email] Sent booking confirmation to ${to}`);
  }
}

// ─── Walk-in confirmation ─────────────────────────────────────────────────────

export interface WalkinEmailParams {
  to: string;
  name: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  eventLocation: string;
}

export async function sendWalkinConfirmation(params: WalkinEmailParams): Promise<void> {
  const { to, name, eventTitle, eventDate, eventTime, eventVenue, eventLocation } = params;
  const firstName = name.split(" ")[0];

  const body = `
    ${eventDetailsBlock(eventDate, eventTime, eventVenue, eventLocation)}
    ${whatToBringBlock()}

    <!-- Cancel / questions note -->
    <tr>
      <td style="padding:0 40px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:${B.amberPale};border-left:3px solid ${B.amber};border-radius:0 10px 10px 0;">
          <tr><td style="padding:14px 20px;">
            <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;
                       color:${B.navy};line-height:1.65;">
              <strong>Can't make it?</strong> Reply to this email as soon as possible
              so we can offer your spot to someone on the waitlist.
            </p>
          </td></tr>
        </table>
      </td>
    </tr>
  `;

  const html = baseEmail({
    subject:      `You're registered — ${eventTitle}`,
    preheader:    `${firstName}, you're on the list for ${eventTitle}. See you on court!`,
    accentColor:  B.amber,
    accentPale:   B.amberPale,
    accentBorder: B.amberBorder,
    badgeEmoji:   '🎾',
    badgeText:    'Walk-in Registered',
    headline:     eventTitle,
    subline:      `Hi ${firstName}, you're confirmed for ${eventTitle}. Your spot is saved — see you on court!`,
    body,
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `You're registered — ${eventTitle}`,
    html,
  });

  if (error) {
    console.error(`[email] Resend error (walk-in confirmation):`, error);
  } else {
    console.log(`[email] Sent walk-in confirmation to ${to}`);
  }
}
