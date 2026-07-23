import { Resend } from "resend";
import QRCode from "qrcode";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "P³ <onboarding@resend.dev>";

// ─── Brand tokens (matches padelexchange.com) ─────────────────────────────────
const B = {
  // Core palette
  royalBlue:   "#4169E1",   // website background / nav
  royalDark:   "#2d52c4",   // deeper blue for hover states
  teal:        "#19C3B0",   // primary accent — logo "3", CTA button
  tealPale:    "#f0fdfb",
  tealBorder:  "#a7f3e8",
  logoDark:    "#0b1825",   // logo mark bg (dark end of gradient)
  logoMid:     "#1a3050",   // logo mark bg (light end of gradient)
  textLight:   "#F4F7FB",   // white-ish text on dark
  // Neutrals
  white:       "#ffffff",
  offWhite:    "#f8fafc",
  bg:          "#eef2fb",   // email page bg — tinted to match brand
  border:      "#dde5f4",
  mutedFg:     "#6b7db3",
  darkText:    "#0f1f3d",
  bodyText:    "#3d4f7a",
  // Semantic
  amber:       "#d97706",
  amberPale:   "#fffbeb",
  amberBorder: "#fde68a",
} as const;

// ─── Logo mark as inline SVG data URI ────────────────────────────────────────
// Matches logo-mark.svg exactly — dark rounded square, white P, teal 3.
// Using data URI so it renders in Gmail, Apple Mail, Outlook.com without
// needing an external host.
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${B.logoMid}"/>
      <stop offset="100%" stop-color="${B.logoDark}"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="92" height="92" rx="20" ry="20" fill="url(#bg)"/>
  <text x="22" y="79" font-family="'Helvetica Neue',Arial,sans-serif" font-weight="900" font-size="60" letter-spacing="-3" fill="${B.textLight}">P</text>
  <text x="65" y="44" font-family="'Helvetica Neue',Arial,sans-serif" font-weight="800" font-size="28" fill="${B.teal}">3</text>
</svg>`;
const LOGO_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString("base64")}`;

// ─── Shared base template ─────────────────────────────────────────────────────

function baseEmail(opts: {
  subject:      string;
  preheader:    string;
  accentColor:  string;
  accentPale:   string;
  accentBorder: string;
  badgeText:    string;
  badgeEmoji:   string;
  headline:     string;
  subline:      string;
  body:         string;
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
</head>
<body style="margin:0;padding:0;background:${B.bg};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;">

  <!-- Preheader -->
  <div style="display:none;font-size:1px;color:${B.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${preheader}&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;
  </div>

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${B.bg};padding:32px 16px;">
  <tr><td align="center">

    <!-- Card -->
    <table width="600" cellpadding="0" cellspacing="0" border="0"
           style="max-width:600px;width:100%;background:${B.white};border-radius:20px;
                  overflow:hidden;box-shadow:0 4px 28px rgba(65,105,225,0.13);">

      <!-- Teal top stripe -->
      <tr>
        <td height="4" style="background:${B.teal};font-size:0;line-height:0;">&nbsp;</td>
      </tr>

      <!-- ═══ HEADER — Royal blue, matching the website nav ═══ -->
      <tr>
        <td style="background:${B.royalBlue};padding:26px 40px 22px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <!-- Logo mark (the actual SVG, same as website) -->
              <td style="vertical-align:middle;width:44px;">
                <img src="${LOGO_DATA_URI}"
                     width="44" height="44" alt="P3"
                     style="display:block;border-radius:11px;
                            box-shadow:0 4px 12px rgba(0,0,0,0.35);" />
              </td>
              <!-- Wordmark -->
              <td style="vertical-align:middle;padding-left:12px;">
                <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                             font-size:14px;font-weight:800;color:${B.textLight};
                             letter-spacing:0.4px;line-height:1;">THE PADEL EXCHANGE</span>
              </td>
              <!-- Court-line decoration (subtle, right-aligned) -->
              <td align="right" style="vertical-align:middle;">
                <table cellpadding="0" cellspacing="0" border="0"><tr>
                  <td width="5" style="border-right:1px solid rgba(255,255,255,0.2);height:28px;">&nbsp;</td>
                  <td width="10">&nbsp;</td>
                  <td width="5" style="border-right:1px solid rgba(255,255,255,0.2);height:28px;">&nbsp;</td>
                  <td width="10">&nbsp;</td>
                  <td width="5" style="border-right:1px solid rgba(255,255,255,0.2);height:28px;">&nbsp;</td>
                </tr></table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ═══ HERO ═══ -->
      <tr>
        <td style="padding:36px 40px 0;">

          <!-- Status badge -->
          <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
            <tr>
              <td style="background:${accentPale};border:1px solid ${accentBorder};
                          border-radius:100px;padding:5px 14px;">
                <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                             font-size:12px;font-weight:700;color:${accentColor};
                             letter-spacing:0.3px;">
                  ${badgeEmoji}&nbsp;&nbsp;${badgeText}
                </span>
              </td>
            </tr>
          </table>

          <!-- Headline -->
          <h1 style="margin:0 0 12px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                      font-size:30px;font-weight:900;color:${B.darkText};line-height:1.1;
                      letter-spacing:-0.6px;">
            ${headline}
          </h1>

          <!-- Subline -->
          <p style="margin:0 0 32px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                     font-size:15px;color:${B.bodyText};line-height:1.65;">
            ${subline}
          </p>
        </td>
      </tr>

      <!-- ═══ INJECTED BODY ═══ -->
      ${body}

      <!-- ═══ FOOTER ═══ -->
      <tr>
        <td style="padding:4px 40px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="border-top:1px solid ${B.border};padding-top:22px;">
            <tr>
              <td align="center">
                <p style="margin:0 0 4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                           font-size:11px;color:${B.mutedFg};text-transform:uppercase;
                           letter-spacing:0.8px;font-weight:700;">
                  The Padel Exchange &middot; London
                </p>
                <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                           font-size:11px;color:${B.mutedFg};">
                  Questions? Reply to this email and we&#39;ll get back to you.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

    </table><!-- /Card -->

  </td></tr>
  </table><!-- /Outer -->
</body>
</html>`;
}

// ─── Reusable blocks ──────────────────────────────────────────────────────────

function eventDetailsBlock(date: string, time: string, venue: string, location: string): string {
  const row = (icon: string, label: string, val: string, sub?: string) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${B.border};">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="38" style="vertical-align:top;padding-top:2px;">
            <div style="width:30px;height:30px;background:${B.tealPale};border-radius:8px;
                        text-align:center;line-height:30px;font-size:14px;
                        border:1px solid ${B.tealBorder};">${icon}</div>
          </td>
          <td style="vertical-align:top;padding-left:2px;">
            <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                       font-size:10px;font-weight:700;color:${B.mutedFg};
                       text-transform:uppercase;letter-spacing:0.8px;">${label}</p>
            <p style="margin:2px 0 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                       font-size:14px;font-weight:700;color:${B.darkText};">${val}</p>
            ${sub ? `<p style="margin:1px 0 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:12px;color:${B.bodyText};">${sub}</p>` : ""}
          </td>
        </tr></table>
      </td>
    </tr>`;

  return `
  <tr>
    <td style="padding:0 40px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background:${B.offWhite};border:1px solid ${B.border};border-radius:14px;">
        <tr><td style="padding:16px 24px 0;">
          <p style="margin:0 0 4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                     font-size:10px;font-weight:700;color:${B.mutedFg};
                     text-transform:uppercase;letter-spacing:1px;">Event Details</p>
        </td></tr>
        <tr><td style="padding:0 24px 12px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${row("&#128197;", "Date", date)}
            ${row("&#128374;", "Time", time)}
            ${row("&#128205;", "Venue", venue, location)}
          </table>
        </td></tr>
      </table>
    </td>
  </tr>`;
}

function whatToBringBlock(): string {
  return `
  <tr>
    <td style="padding:0 40px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background:${B.tealPale};border-left:3px solid ${B.teal};
                    border-radius:0 10px 10px 0;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 6px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                     font-size:11px;font-weight:800;color:${B.teal};
                     text-transform:uppercase;letter-spacing:0.8px;">
            &#127934;&nbsp;&nbsp;What to bring
          </p>
          <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                     font-size:13px;color:${B.darkText};line-height:1.65;">
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
      <!-- Ticket: royal blue background, matching the website -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background:${B.royalBlue};border-radius:16px;overflow:hidden;">

        <!-- Ticket header -->
        <tr>
          <td style="padding:18px 24px 14px;
                     border-bottom:2px dashed rgba(255,255,255,0.2);">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="vertical-align:middle;">
                <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                           font-size:10px;font-weight:800;color:rgba(255,255,255,0.55);
                           text-transform:uppercase;letter-spacing:1.2px;">Entry Ticket</p>
                <p style="margin:4px 0 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                           font-size:15px;font-weight:900;color:${B.textLight};">
                  P&#179; The Padel Exchange
                </p>
              </td>
              <td align="right" style="vertical-align:top;">
                <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                           font-size:10px;color:rgba(255,255,255,0.45);
                           text-transform:uppercase;letter-spacing:0.8px;">Ref</p>
                <p style="margin:2px 0 0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                           font-size:13px;font-weight:700;color:${B.teal};">
                  #${String(bookingId).padStart(5, "0")}
                </p>
              </td>
            </tr></table>
          </td>
        </tr>

        <!-- QR code -->
        <tr>
          <td align="center" style="padding:24px 24px 18px;">
            <div style="display:inline-block;background:${B.white};
                        border-radius:12px;padding:10px;">
              <img src="${qrDataUri}" width="160" height="160"
                   alt="QR check-in code"
                   style="display:block;border-radius:6px;" />
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:0 24px 22px;">
            <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                       font-size:12px;color:rgba(255,255,255,0.6);
                       line-height:1.6;text-align:center;">
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
    width: 200, margin: 2,
    color: { dark: B.royalBlue, light: B.white },
  });

  const html = baseEmail({
    subject:      `You're booked — ${eventTitle}`,
    preheader:    `${firstName}, your spot at ${eventTitle} is confirmed. Your QR entry ticket is inside.`,
    accentColor:  B.teal,
    accentPale:   B.tealPale,
    accentBorder: B.tealBorder,
    badgeEmoji:   "✅",
    badgeText:    "Booking Confirmed",
    headline:     eventTitle,
    subline:      `Hi ${firstName}, your spot is confirmed and ready. We can&rsquo;t wait to see you on court &mdash; your QR entry ticket is below.`,
    body: `
      ${eventDetailsBlock(eventDate, eventTime, eventVenue, eventLocation)}
      ${whatToBringBlock()}
      ${qrTicketBlock(qrDataUri, bookingId)}
    `,
  });

  const { error } = await resend.emails.send({
    from: FROM, to,
    subject: `You're booked — ${eventTitle}`,
    html,
  });

  if (error) console.error(`[email] Resend error (booking confirmation):`, error);
  else       console.log(`[email] Sent booking confirmation to ${to}`);
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

  const cancelNote = `
  <tr>
    <td style="padding:0 40px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background:${B.amberPale};border-left:3px solid ${B.amber};
                    border-radius:0 10px 10px 0;">
        <tr><td style="padding:14px 20px;">
          <p style="margin:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
                     font-size:13px;color:${B.darkText};line-height:1.65;">
            <strong>Can&#39;t make it?</strong> Reply to this email as soon as possible
            so we can offer your spot to someone on the waitlist.
          </p>
        </td></tr>
      </table>
    </td>
  </tr>`;

  const html = baseEmail({
    subject:      `You're registered — ${eventTitle}`,
    preheader:    `${firstName}, you're on the list for ${eventTitle}. See you on court!`,
    accentColor:  B.teal,
    accentPale:   B.tealPale,
    accentBorder: B.tealBorder,
    badgeEmoji:   "🎾",
    badgeText:    "Walk-in Registered",
    headline:     eventTitle,
    subline:      `Hi ${firstName}, you&rsquo;re confirmed for ${eventTitle}. Your spot is saved &mdash; see you on court!`,
    body: `
      ${eventDetailsBlock(eventDate, eventTime, eventVenue, eventLocation)}
      ${whatToBringBlock()}
      ${cancelNote}
    `,
  });

  const { error } = await resend.emails.send({
    from: FROM, to,
    subject: `You're registered — ${eventTitle}`,
    html,
  });

  if (error) console.error(`[email] Resend error (walk-in confirmation):`, error);
  else       console.log(`[email] Sent walk-in confirmation to ${to}`);
}
