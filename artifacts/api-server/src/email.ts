import { Resend } from "resend";
import QRCode from "qrcode";
import { findVenue, FORMAT_INFO } from "./venues.js";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "P³ <onboarding@resend.dev>";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const B = {
  royalBlue:   "#4169E1",
  teal:        "#19C3B0",
  tealPale:    "#f0fdfb",
  tealBorder:  "#a7f3e8",
  tealDark:    "#0e9a8b",
  logoDark:    "#0b1825",
  logoMid:     "#1a3050",
  textLight:   "#F4F7FB",
  white:       "#ffffff",
  offWhite:    "#f8fafc",
  bg:          "#eef2fb",
  border:      "#dde5f4",
  mutedFg:     "#6b7db3",
  darkText:    "#0f1f3d",
  bodyText:    "#3d4f7a",
  amber:       "#d97706",
  amberPale:   "#fffbeb",
  amberBorder: "#fde68a",
} as const;

// ─── Logo data URI ────────────────────────────────────────────────────────────
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${B.logoMid}"/><stop offset="100%" stop-color="${B.logoDark}"/></linearGradient></defs><rect x="4" y="4" width="92" height="92" rx="20" ry="20" fill="url(#bg)"/><text x="22" y="79" font-family="Helvetica Neue,Arial,sans-serif" font-weight="900" font-size="60" letter-spacing="-3" fill="${B.textLight}">P</text><text x="65" y="44" font-family="Helvetica Neue,Arial,sans-serif" font-weight="800" font-size="28" fill="${B.teal}">3</text></svg>`;
const LOGO_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString("base64")}`;

// ─── Base template ────────────────────────────────────────────────────────────

function baseEmail(opts: {
  subject:      string;
  preheader:    string;
  badgeEmoji:   string;
  badgeText:    string;
  headline:     string;
  subline:      string;
  body:         string;
}): string {
  const { preheader, badgeEmoji, badgeText, headline, subline, body } = opts;
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>${opts.subject}</title>
</head>
<body style="margin:0;padding:0;background:${B.bg};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;">

  <div style="display:none;font-size:1px;color:${B.bg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${preheader}&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${B.bg};padding:32px 16px;">
  <tr><td align="center">

    <table width="600" cellpadding="0" cellspacing="0" border="0"
           style="max-width:600px;width:100%;background:${B.white};border-radius:20px;
                  overflow:hidden;box-shadow:0 4px 28px rgba(65,105,225,0.13);">

      <!-- Teal top stripe -->
      <tr><td height="4" style="background:${B.teal};font-size:0;line-height:0;">&nbsp;</td></tr>

      <!-- Header -->
      <tr>
        <td style="background:${B.royalBlue};padding:24px 36px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="vertical-align:middle;width:44px;">
              <img src="${LOGO_URI}" width="44" height="44" alt="P3"
                   style="display:block;border-radius:11px;box-shadow:0 4px 12px rgba(0,0,0,0.35);"/>
            </td>
            <td style="vertical-align:middle;padding-left:12px;">
              <span style="font-size:14px;font-weight:800;color:${B.textLight};letter-spacing:0.4px;">THE PADEL EXCHANGE</span>
            </td>
            <td align="right" style="vertical-align:middle;">
              <table cellpadding="0" cellspacing="0" border="0"><tr>
                <td width="5" style="border-right:1px solid rgba(255,255,255,0.2);height:28px;">&nbsp;</td>
                <td width="10">&nbsp;</td>
                <td width="5" style="border-right:1px solid rgba(255,255,255,0.2);height:28px;">&nbsp;</td>
                <td width="10">&nbsp;</td>
                <td width="5" style="border-right:1px solid rgba(255,255,255,0.2);height:28px;">&nbsp;</td>
              </tr></table>
            </td>
          </tr></table>
        </td>
      </tr>

      <!-- Hero -->
      <tr>
        <td style="padding:36px 36px 0;">
          <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;"><tr>
            <td style="background:${B.tealPale};border:1px solid ${B.tealBorder};
                        border-radius:100px;padding:5px 14px;">
              <span style="font-size:12px;font-weight:700;color:${B.teal};">
                ${badgeEmoji}&nbsp;&nbsp;${badgeText}
              </span>
            </td>
          </tr></table>
          <h1 style="margin:0 0 12px;font-size:28px;font-weight:900;color:${B.darkText};
                      line-height:1.1;letter-spacing:-0.5px;">${headline}</h1>
          <p style="margin:0 0 32px;font-size:15px;color:${B.bodyText};line-height:1.65;">${subline}</p>
        </td>
      </tr>

      ${body}

      <!-- Footer -->
      <tr>
        <td style="padding:4px 36px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="border-top:1px solid ${B.border};padding-top:22px;"><tr>
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
          </tr></table>
        </td>
      </tr>

    </table>
  </td></tr>
  </table>
</body>
</html>`;
}

// ─── Shared blocks ────────────────────────────────────────────────────────────

function eventDetailsBlock(date: string, time: string, venue: string, location: string): string {
  const row = (icon: string, label: string, val: string, sub?: string) => `
    <tr><td style="padding:11px 0;border-bottom:1px solid ${B.border};">
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="38" style="vertical-align:top;padding-top:2px;">
          <div style="width:30px;height:30px;background:${B.tealPale};border-radius:8px;
                      text-align:center;line-height:30px;font-size:14px;
                      border:1px solid ${B.tealBorder};">${icon}</div>
        </td>
        <td style="vertical-align:top;padding-left:4px;">
          <p style="margin:0;font-size:10px;font-weight:700;color:${B.mutedFg};
                     text-transform:uppercase;letter-spacing:0.8px;">${label}</p>
          <p style="margin:2px 0 0;font-size:14px;font-weight:700;color:${B.darkText};">${val}</p>
          ${sub ? `<p style="margin:1px 0 0;font-size:12px;color:${B.bodyText};">${sub}</p>` : ""}
        </td>
      </tr></table>
    </td></tr>`;

  return `
  <tr><td style="padding:0 36px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${B.offWhite};border:1px solid ${B.border};border-radius:14px;">
      <tr><td style="padding:16px 20px 0;">
        <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:${B.mutedFg};
                   text-transform:uppercase;letter-spacing:1px;">Event Details</p>
      </td></tr>
      <tr><td style="padding:0 20px 12px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${row("&#128197;", "Date", date)}
          ${row("&#128374;", "Time", time)}
          ${row("&#128205;", "Venue", venue, location)}
        </table>
      </td></tr>
    </table>
  </td></tr>`;
}

function venueBlock(venueName: string): string {
  const v = findVenue(venueName);
  if (!v) return "";

  const surfaceLabel = { indoor: "&#127968; Indoor", outdoor: "&#127807; Outdoor", mixed: "&#9728; Indoor &amp; Outdoor" }[v.surface];

  const lineChips = v.transport.lines.map(l =>
    `<span style="display:inline-block;background:${l.color};color:#fff;
                  font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;
                  margin:0 4px 4px 0;">${l.name}</span>`
  ).join("");

  const heroImg = v.heroB64
    ? `<tr><td style="padding:0;line-height:0;font-size:0;">
         <img src="${v.heroB64}" width="528" alt="${v.name}"
              style="display:block;width:100%;max-width:528px;
                     border-radius:12px 12px 0 0;object-fit:cover;" />
       </td></tr>`
    : "";

  return `
  <!-- ══ VENUE ══ -->
  <tr><td style="padding:0 36px 20px;">

    <!-- Section label -->
    <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:${B.mutedFg};
               text-transform:uppercase;letter-spacing:1px;">The Venue</p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${B.offWhite};border:1px solid ${B.border};
                  border-radius:14px;overflow:hidden;">

      ${heroImg}

      <!-- Venue name + blurb -->
      <tr><td style="padding:20px 20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:top;">
            <p style="margin:0 0 2px;font-size:17px;font-weight:900;color:${B.darkText};">${v.name}</p>
            <p style="margin:0 0 10px;font-size:12px;color:${B.mutedFg};">
              &#128205; ${v.location}&nbsp;&nbsp;&middot;&nbsp;&nbsp;${v.courts} courts&nbsp;&nbsp;&middot;&nbsp;&nbsp;${surfaceLabel}
            </p>
          </td>
        </tr></table>
        <p style="margin:0 0 16px;font-size:13px;color:${B.bodyText};line-height:1.65;">${v.blurb}</p>
      </td></tr>

      <!-- Transport -->
      <tr><td style="padding:0 20px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="background:${B.royalBlue}1a;border-radius:10px;padding:14px 16px;">
          <tr><td>
            <p style="margin:0 0 8px;font-size:10px;font-weight:700;color:${B.mutedFg};
                       text-transform:uppercase;letter-spacing:0.8px;">&#128652; Getting there</p>
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:${B.darkText};">
              ${v.transport.station} station &mdash; ${v.transport.travelTime} from ${v.transport.from}
            </p>
            <div>${lineChips}</div>
          </td></tr>
        </table>
      </td></tr>

      <!-- CTA buttons -->
      <tr><td style="padding:0 20px 20px;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="padding-right:8px;">
            <a href="${v.mapsUrl}"
               style="display:inline-block;background:${B.teal};color:#fff;
                      font-size:13px;font-weight:700;text-decoration:none;
                      padding:10px 18px;border-radius:8px;">
              &#128506; Open in Maps
            </a>
          </td>
          <td>
            <a href="${v.url}"
               style="display:inline-block;background:transparent;color:${B.teal};
                      font-size:13px;font-weight:700;text-decoration:none;
                      padding:10px 18px;border-radius:8px;
                      border:1.5px solid ${B.teal};">
              Visit venue site
            </a>
          </td>
        </tr></table>
      </td></tr>

    </table>
  </td></tr>`;
}

function formatBlock(format: string): string {
  const info = FORMAT_INFO[format?.toLowerCase()];
  if (!info) return "";

  return `
  <!-- ══ FORMAT ══ -->
  <tr><td style="padding:0 36px 20px;">
    <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:${B.mutedFg};
               text-transform:uppercase;letter-spacing:1px;">What to Expect</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${B.royalBlue};border-radius:14px;overflow:hidden;">
      <tr><td style="padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:top;width:44px;">
            <div style="width:40px;height:40px;background:rgba(255,255,255,0.12);
                        border-radius:10px;text-align:center;line-height:40px;
                        font-size:20px;">${info.emoji}</div>
          </td>
          <td style="vertical-align:top;padding-left:14px;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:900;color:${B.textLight};">
              ${info.label} Format
            </p>
            <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${B.teal};">
              ${info.summary}
            </p>
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.8);line-height:1.65;">
              ${info.detail}
            </p>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>`;
}

function whatToBringBlock(): string {
  return `
  <tr><td style="padding:0 36px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${B.tealPale};border-left:3px solid ${B.teal};
                  border-radius:0 10px 10px 0;">
      <tr><td style="padding:16px 18px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:800;color:${B.teal};
                   text-transform:uppercase;letter-spacing:0.8px;">
          &#127934;&nbsp;&nbsp;What to bring
        </p>
        <p style="margin:0;font-size:13px;color:${B.darkText};line-height:1.65;">
          Your racket, appropriate court shoes, and plenty of energy.
          Water and refreshments will be available on the day.
        </p>
      </td></tr>
    </table>
  </td></tr>`;
}

function videoLinksBlock(): string {
  return `
  <!-- ══ VIDEOS / LINKS ══ -->
  <tr><td style="padding:0 36px 24px;">
    <p style="margin:0 0 12px;font-size:10px;font-weight:700;color:${B.mutedFg};
               text-transform:uppercase;letter-spacing:1px;">New to Padel?</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="border:1px solid ${B.border};border-radius:14px;overflow:hidden;">

      <!-- Row 1 -->
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid ${B.border};">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="vertical-align:middle;width:36px;">
              <div style="width:32px;height:32px;background:#FF0000;border-radius:8px;
                          text-align:center;line-height:32px;font-size:16px;">&#9654;</div>
            </td>
            <td style="vertical-align:middle;padding-left:12px;">
              <p style="margin:0;font-size:13px;font-weight:700;color:${B.darkText};">
                How Americano works
              </p>
              <p style="margin:2px 0 0;font-size:12px;color:${B.bodyText};">
                A quick explainer on the most popular social padel format
              </p>
            </td>
            <td align="right" style="vertical-align:middle;padding-left:12px;white-space:nowrap;">
              <a href="https://www.youtube.com/results?search_query=padel+americano+format+explained"
                 style="font-size:12px;font-weight:700;color:${B.teal};text-decoration:none;">
                Watch &rarr;
              </a>
            </td>
          </tr></table>
        </td>
      </tr>

      <!-- Row 2 -->
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid ${B.border};">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="vertical-align:middle;width:36px;">
              <div style="width:32px;height:32px;background:#FF0000;border-radius:8px;
                          text-align:center;line-height:32px;font-size:16px;">&#9654;</div>
            </td>
            <td style="vertical-align:middle;padding-left:12px;">
              <p style="margin:0;font-size:13px;font-weight:700;color:${B.darkText};">
                Padel basics for beginners
              </p>
              <p style="margin:2px 0 0;font-size:12px;color:${B.bodyText};">
                Rules, scoring, and what makes padel so addictive
              </p>
            </td>
            <td align="right" style="vertical-align:middle;padding-left:12px;white-space:nowrap;">
              <a href="https://www.youtube.com/results?search_query=padel+beginner+guide+rules"
                 style="font-size:12px;font-weight:700;color:${B.teal};text-decoration:none;">
                Watch &rarr;
              </a>
            </td>
          </tr></table>
        </td>
      </tr>

      <!-- Row 3 -->
      <tr>
        <td style="padding:14px 18px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="vertical-align:middle;width:36px;">
              <div style="width:32px;height:32px;background:${B.royalBlue};border-radius:8px;
                          text-align:center;line-height:32px;font-size:16px;">&#127931;</div>
            </td>
            <td style="vertical-align:middle;padding-left:12px;">
              <p style="margin:0;font-size:13px;font-weight:700;color:${B.darkText};">
                Follow P&#179; on Instagram
              </p>
              <p style="margin:2px 0 0;font-size:12px;color:${B.bodyText};">
                Event highlights, rallies, and community moments
              </p>
            </td>
            <td align="right" style="vertical-align:middle;padding-left:12px;white-space:nowrap;">
              <a href="https://www.instagram.com/padelcubed"
                 style="font-size:12px;font-weight:700;color:${B.teal};text-decoration:none;">
                Follow &rarr;
              </a>
            </td>
          </tr></table>
        </td>
      </tr>

    </table>
  </td></tr>`;
}

function appDownloadBlock(): string {
  return `
  <!-- ══ APP DOWNLOAD ══ -->
  <tr><td style="padding:0 36px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${B.royalBlue};border-radius:14px;overflow:hidden;">
      <tr><td style="padding:20px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:top;width:44px;">
            <div style="width:40px;height:40px;background:rgba(255,255,255,0.12);
                        border-radius:10px;text-align:center;line-height:40px;
                        font-size:20px;">📱</div>
          </td>
          <td style="vertical-align:top;padding-left:14px;">
            <p style="margin:0 0 4px;font-size:15px;font-weight:900;color:${B.textLight};">
              Get the P&#179; App
            </p>
            <p style="margin:0 0 12px;font-size:13px;color:rgba(255,255,255,0.75);line-height:1.6;">
              On the day, open the app to access your live leaderboard position, round-by-round scores,
              and your QR entry ticket — all in one place.
            </p>
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="padding-right:8px;">
                <a href="https://www.padelcubed.co.uk/padel-cubed-mobile/"
                   style="display:inline-block;background:${B.teal};color:#fff;
                          font-size:13px;font-weight:700;text-decoration:none;
                          padding:9px 16px;border-radius:8px;">
                  &#128247; Open App
                </a>
              </td>
              <td>
                <a href="https://www.padelcubed.co.uk"
                   style="display:inline-block;background:transparent;color:${B.teal};
                          font-size:13px;font-weight:700;text-decoration:none;
                          padding:9px 16px;border-radius:8px;
                          border:1.5px solid ${B.teal};">
                  Visit website
                </a>
              </td>
            </tr></table>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>`;
}

function qrTicketBlock(qrDataUri: string, bookingId: number): string {
  return `
  <tr><td style="padding:0 36px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${B.royalBlue};border-radius:16px;overflow:hidden;">

      <tr><td style="padding:18px 24px 14px;border-bottom:2px dashed rgba(255,255,255,0.2);">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td>
            <p style="margin:0;font-size:10px;font-weight:800;color:rgba(255,255,255,0.5);
                       text-transform:uppercase;letter-spacing:1.2px;">Entry Ticket</p>
            <p style="margin:4px 0 0;font-size:15px;font-weight:900;color:${B.textLight};">
              P&#179; The Padel Exchange
            </p>
          </td>
          <td align="right" style="vertical-align:top;">
            <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.45);
                       text-transform:uppercase;letter-spacing:0.8px;">Ref</p>
            <p style="margin:2px 0 0;font-size:13px;font-weight:700;color:${B.teal};">
              #${String(bookingId).padStart(5, "0")}
            </p>
          </td>
        </tr></table>
      </td></tr>

      <tr><td align="center" style="padding:24px 24px 18px;">
        <div style="display:inline-block;background:${B.white};border-radius:12px;padding:10px;">
          <img src="${qrDataUri}" width="160" height="160" alt="QR check-in code"
               style="display:block;border-radius:6px;"/>
        </div>
      </td></tr>

      <tr><td align="center" style="padding:0 24px 22px;">
        <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.6);
                   line-height:1.6;text-align:center;">
          Show this QR code at the door for instant check-in.<br/>
          Screenshot it so it works offline.
        </p>
      </td></tr>

    </table>
  </td></tr>`;
}

// ─── Booking confirmation ─────────────────────────────────────────────────────

export interface BookingConfirmationParams {
  to:            string;
  name:          string;
  eventId:       string;
  bookingId:     number;
  eventTitle:    string;
  eventDate:     string;
  eventTime:     string;
  eventVenue:    string;
  eventLocation: string;
  eventFormat?:  string;
}

export async function sendBookingConfirmation(params: BookingConfirmationParams): Promise<void> {
  const { to, name, eventId, bookingId, eventTitle,
          eventDate, eventTime, eventVenue, eventLocation, eventFormat } = params;
  const firstName = name.split(" ")[0];

  const qrPayload  = Buffer.from(JSON.stringify({ v: 1, eventId, bookingId, email: to })).toString("base64");
  const qrDataUri  = await QRCode.toDataURL(qrPayload, {
    width: 200, margin: 2,
    color: { dark: B.royalBlue, light: B.white },
  });

  const html = baseEmail({
    subject:    `You're booked — ${eventTitle}`,
    preheader:  `${firstName}, your spot at ${eventTitle} is confirmed. QR entry ticket + venue info inside.`,
    badgeEmoji: "✅",
    badgeText:  "Booking Confirmed",
    headline:   eventTitle,
    subline:    `Hi ${firstName}, your spot is confirmed. Everything you need for the day is below &mdash; including your QR entry ticket, how to get there, and what to expect on court.`,
    body: `
      ${eventDetailsBlock(eventDate, eventTime, eventVenue, eventLocation)}
      ${venueBlock(eventVenue)}
      ${eventFormat ? formatBlock(eventFormat) : ""}
      ${whatToBringBlock()}
      ${appDownloadBlock()}
      ${videoLinksBlock()}
      ${qrTicketBlock(qrDataUri, bookingId)}
    `,
  });

  const { error } = await resend.emails.send({
    from: FROM, to,
    subject: `You're booked — ${eventTitle}`,
    html,
  });

  if (error) console.error("[email] Resend error (booking confirmation):", error);
  else       console.log(`[email] Sent booking confirmation to ${to}`);
}

// ─── Admin password reset ─────────────────────────────────────────────────────

export async function sendPasswordResetEmail(params: {
  to: string;
  name: string;
  code: string;
}): Promise<void> {
  const { to, name, code } = params;
  const firstName = name.split(" ")[0];

  const digits = code.split("").map(d =>
    `<span style="display:inline-block;width:42px;height:54px;line-height:54px;
                  text-align:center;font-size:28px;font-weight:900;color:${B.darkText};
                  background:${B.offWhite};border:2px solid ${B.border};
                  border-radius:10px;margin:0 4px;">${d}</span>`
  ).join("");

  const html = baseEmail({
    subject:    "P³ Admin — password reset code",
    preheader:  `Your 6-digit reset code is ${code}. It expires in 30 minutes.`,
    badgeEmoji: "🔑",
    badgeText:  "Password Reset",
    headline:   "Reset your password",
    subline:    `Hi ${firstName}, enter the code below in the app to set a new password. It expires in <strong>30 minutes</strong>.`,
    body: `
  <tr><td style="padding:0 36px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${B.offWhite};border:1px solid ${B.border};border-radius:16px;">
      <tr><td style="padding:32px 24px;" align="center">
        <p style="margin:0 0 20px;font-size:11px;font-weight:700;color:${B.mutedFg};
                   text-transform:uppercase;letter-spacing:1px;">Your reset code</p>
        <div style="display:inline-block;">${digits}</div>
        <p style="margin:20px 0 0;font-size:12px;color:${B.mutedFg};">
          Valid for 30 minutes &middot; Single use only
        </p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 36px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${B.amberPale};border-left:3px solid ${B.amber};
                  border-radius:0 10px 10px 0;">
      <tr><td style="padding:14px 18px;">
        <p style="margin:0;font-size:13px;color:${B.darkText};line-height:1.65;">
          If you didn&#39;t request this, you can safely ignore this email.
          Your password will not change.
        </p>
      </td></tr>
    </table>
  </td></tr>`,
  });

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "P³ Admin — password reset code",
    html,
  });

  if (error) console.error("[email] Resend error (password reset):", error);
  else       console.log(`[email] Sent password reset code to ${to}`);
}

// ─── Registration welcome (member) ───────────────────────────────────────────

export interface RegistrationWelcomeParams {
  to:         string;
  fullName:   string;
  padelLevel?: string | null;
  interests?:  string[] | null;
}

export async function sendRegistrationWelcome(params: RegistrationWelcomeParams): Promise<void> {
  const { to, fullName, padelLevel, interests } = params;
  const firstName = fullName.split(" ")[0];

  const html = baseEmail({
    subject:    "You're on the P³ list — welcome",
    preheader:  `${firstName}, you're registered. We'll be in touch about the October launch event.`,
    badgeEmoji: "🎾",
    badgeText:  "You're on the list",
    headline:   `Welcome to P³, ${firstName}.`,
    subline:    "People, Padel, Places is a curated padel community for founders and senior professionals. You&rsquo;ve secured your spot — we&rsquo;ll be in touch as the October launch event takes shape.",
    body: `
  <!-- ══ WHAT HAPPENS NEXT ══ -->
  <tr><td style="padding:0 36px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${B.offWhite};border:1px solid ${B.border};border-radius:16px;overflow:hidden;">
      <tr><td style="padding:20px 24px 4px;">
        <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:${B.mutedFg};
                   text-transform:uppercase;letter-spacing:1px;">What happens next</p>
      </td></tr>
      ${[
        ["📣", "Launch event announcement", "We'll email you first when the October event goes on sale — members get priority access before public release."],
        ["🎾", "Curated events, not open courts", "Every P³ event uses a rotating format (Americano) so you play with everyone in the room. One evening, a dozen real connections."],
        ["📱", "Get the app", "Download the P³ app before the day — it holds your entry ticket, live scores, and leaderboard position in real time."],
      ].map(([icon, title, body]) => `
      <tr><td style="padding:0 24px 16px;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="width:36px;vertical-align:top;padding-top:2px;">
            <div style="width:30px;height:30px;background:${B.tealPale};border:1px solid ${B.tealBorder};
                        border-radius:8px;text-align:center;line-height:30px;font-size:14px;">${icon}</div>
          </td>
          <td style="vertical-align:top;padding-left:10px;">
            <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:${B.darkText};">${title}</p>
            <p style="margin:0;font-size:13px;color:${B.bodyText};line-height:1.6;">${body}</p>
          </td>
        </tr></table>
      </td></tr>`).join("")}
    </table>
  </td></tr>

  ${appDownloadBlock()}

  <!-- ══ LEVEL / INTERESTS CONFIRMATION ══ -->
  ${(padelLevel || (interests && interests.length)) ? `
  <tr><td style="padding:0 36px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${B.tealPale};border:1px solid ${B.tealBorder};border-radius:14px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:${B.teal};
                   text-transform:uppercase;letter-spacing:1px;">Your profile</p>
        ${padelLevel ? `<p style="margin:0 0 6px;font-size:13px;color:${B.darkText};">🎾&nbsp; <strong>Padel level:</strong> ${padelLevel}</p>` : ""}
        ${interests && interests.length ? `<p style="margin:0;font-size:13px;color:${B.darkText};">✨&nbsp; <strong>Interests:</strong> ${interests.join(", ")}</p>` : ""}
      </td></tr>
    </table>
  </td></tr>` : ""}

  <!-- ══ LINKEDIN FOLLOW CTA ══ -->
  <tr><td style="padding:0 36px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:#EEF4FF;border:1px solid #C7D9F8;border-radius:14px;">
      <tr><td style="padding:20px 24px;" align="center">
        <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:${B.darkText};">Stay in the loop</p>
        <p style="margin:0 0 16px;font-size:12px;color:${B.bodyText};line-height:1.5;">
          Follow us on LinkedIn for event announcements, community updates, and early access news.
        </p>
        <a href="https://www.linkedin.com/company/people-padel-places/"
           style="display:inline-block;background:#0A66C2;color:#fff;
                  font-size:13px;font-weight:700;text-decoration:none;
                  padding:10px 24px;border-radius:10px;">
          Follow Padelcubed on LinkedIn
        </a>
      </td></tr>
    </table>
  </td></tr>

  <!-- ══ SOCIAL LINKS ══ -->
  <tr><td style="padding:0 36px 32px;" align="center">
    <p style="margin:0 0 12px;font-size:12px;color:${B.mutedFg};">Also find us on</p>
    <a href="https://www.instagram.com/padelcubed/"
       style="display:inline-block;background:${B.royalBlue};color:#fff;
              font-size:12px;font-weight:700;text-decoration:none;
              padding:8px 16px;border-radius:8px;">Instagram</a>
  </td></tr>`,
  });

  const { error } = await resend.emails.send({
    from: FROM, to,
    subject: "You're on the P³ list — welcome",
    html,
  });

  if (error) console.error("[email] Resend error (registration welcome):", error);
  else       console.log(`[email] Sent registration welcome to ${to}`);
}

// ─── New member notification (admin) ─────────────────────────────────────────

export interface NewMemberNotificationParams {
  fullName:     string;
  email:        string;
  company?:     string | null;
  jobTitle?:    string | null;
  industry?:    string | null;
  function?:    string | null;
  seniority?:   string | null;
  padelLevel?:  string | null;
  interests?:   string[] | null;
  linkedinUrl?: string | null;
  linkedinVerified?: boolean;
}

export async function sendNewMemberNotification(params: NewMemberNotificationParams): Promise<void> {
  const ADMIN_TO = "info@padelcubed.co.uk";

  const row = (label: string, value: string | null | undefined) =>
    value ? `
    <tr>
      <td style="padding:9px 16px;font-size:12px;font-weight:700;color:${B.mutedFg};
                 text-transform:uppercase;letter-spacing:0.7px;white-space:nowrap;
                 border-bottom:1px solid ${B.border};width:140px;">${label}</td>
      <td style="padding:9px 16px;font-size:13px;color:${B.darkText};
                 border-bottom:1px solid ${B.border};">${value}</td>
    </tr>` : "";

  const html = baseEmail({
    subject:    `New member: ${params.fullName}`,
    preheader:  `${params.fullName}${params.company ? ` · ${params.company}` : ""} just registered their interest on P³.`,
    badgeEmoji: "🆕",
    badgeText:  "New Member",
    headline:   params.fullName,
    subline:    `${params.company ? `${params.company}${params.jobTitle ? ` — ${params.jobTitle}` : ""}` : params.jobTitle ?? "Just registered their interest on padelcubed.co.uk."}`,
    body: `
  <!-- ══ PROFILE TABLE ══ -->
  <tr><td style="padding:0 36px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${B.offWhite};border:1px solid ${B.border};border-radius:16px;overflow:hidden;">
      <tr><td colspan="2" style="padding:14px 16px 0;">
        <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:${B.mutedFg};
                   text-transform:uppercase;letter-spacing:1px;">Profile</p>
      </td></tr>
      ${row("Email",        `<a href="mailto:${params.email}" style="color:${B.royalBlue};text-decoration:none;">${params.email}</a>`)}
      ${row("Company",      params.company)}
      ${row("Job title",    params.jobTitle)}
      ${row("Industry",     params.industry)}
      ${row("Role type",    params.function)}
      ${row("Seniority",    params.seniority)}
      ${row("Padel level",  params.padelLevel)}
      ${row("Interests",    params.interests?.join(", "))}
      ${row("LinkedIn",     params.linkedinUrl
        ? `<a href="${params.linkedinUrl}" style="color:${B.royalBlue};text-decoration:none;">${params.linkedinUrl}</a>`
        : params.linkedinVerified ? "Verified via OAuth (no URL captured)" : null)}
    </table>
  </td></tr>

  <!-- ══ QUICK ACTIONS ══ -->
  <tr><td style="padding:0 36px 32px;">
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding-right:8px;">
        <a href="mailto:${params.email}?subject=Welcome to P³"
           style="display:inline-block;background:${B.teal};color:#fff;
                  font-size:13px;font-weight:700;text-decoration:none;
                  padding:10px 18px;border-radius:9px;">Reply to ${params.fullName.split(" ")[0]}</a>
      </td>
      <td>
        <a href="https://www.padelcubed.co.uk/api/admin/registrations/export"
           style="display:inline-block;background:${B.offWhite};color:${B.darkText};
                  border:1px solid ${B.border};
                  font-size:13px;font-weight:700;text-decoration:none;
                  padding:10px 18px;border-radius:9px;">Export all members</a>
      </td>
    </tr></table>
  </td></tr>`,
  });

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      ADMIN_TO,
    replyTo: params.email,
    subject: `New member: ${params.fullName}`,
    html,
  });

  if (error) console.error("[email] Resend error (new member notification):", error);
  else       console.log(`[email] Sent new member notification for ${params.email}`);
}

// ─── Walk-in confirmation ─────────────────────────────────────────────────────

export interface WalkinEmailParams {
  to:            string;
  name:          string;
  eventTitle:    string;
  eventDate:     string;
  eventTime:     string;
  eventVenue:    string;
  eventLocation: string;
  eventFormat?:  string;
}

export async function sendWalkinConfirmation(params: WalkinEmailParams): Promise<void> {
  const { to, name, eventTitle, eventDate, eventTime,
          eventVenue, eventLocation, eventFormat } = params;
  const firstName = name.split(" ")[0];

  const cancelNote = `
  <tr><td style="padding:0 36px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${B.amberPale};border-left:3px solid ${B.amber};
                  border-radius:0 10px 10px 0;">
      <tr><td style="padding:14px 18px;">
        <p style="margin:0;font-size:13px;color:${B.darkText};line-height:1.65;">
          <strong>Can&#39;t make it?</strong> Reply to this email as soon as possible
          so we can offer your spot to someone on the waitlist.
        </p>
      </td></tr>
    </table>
  </td></tr>`;

  const html = baseEmail({
    subject:    `You're registered — ${eventTitle}`,
    preheader:  `${firstName}, you're on the list for ${eventTitle}. Venue details + what to expect inside.`,
    badgeEmoji: "🎾",
    badgeText:  "Walk-in Registered",
    headline:   eventTitle,
    subline:    `Hi ${firstName}, you&rsquo;re confirmed for ${eventTitle}. Here&rsquo;s everything you need to know before the day.`,
    body: `
      ${eventDetailsBlock(eventDate, eventTime, eventVenue, eventLocation)}
      ${venueBlock(eventVenue)}
      ${eventFormat ? formatBlock(eventFormat) : ""}
      ${whatToBringBlock()}
      ${appDownloadBlock()}
      ${videoLinksBlock()}
      ${cancelNote}
    `,
  });

  const { error } = await resend.emails.send({
    from: FROM, to,
    subject: `You're registered — ${eventTitle}`,
    html,
  });

  if (error) console.error("[email] Resend error (walk-in confirmation):", error);
  else       console.log(`[email] Sent walk-in confirmation to ${to}`);
}

// ─── Claim-registration verification code ────────────────────────────────────
export async function sendClaimCode({ to, code }: { to: string; code: string }): Promise<void> {
  const html = baseEmail({
    subject:    "Link your P³ registration — verification code",
    preheader:  `Your code is ${code} — valid for 10 minutes.`,
    badgeEmoji: "🔗",
    badgeText:  "Account linking",
    headline:   "Link your registration",
    subline:    "You asked to link an existing P³ registration to your Dev AI account.",
    body: `
      <tr><td style="padding:24px 32px 0;">
        <p style="margin:0 0 16px;font-size:15px;color:${B.bodyText};line-height:1.65;">
          Enter the code below in the P³ app to complete the link. It expires in <strong>10 minutes</strong>.
        </p>
        <div style="background:${B.tealPale};border:1px solid ${B.tealBorder};border-radius:12px;padding:24px;text-align:center;margin-bottom:16px;">
          <span style="font-size:36px;font-weight:700;letter-spacing:0.2em;color:${B.royalBlue};font-family:monospace;">${code}</span>
        </div>
        <p style="margin:0;font-size:13px;color:${B.mutedFg};line-height:1.65;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </td></tr>
    `,
  });

  const { error } = await resend.emails.send({
    from: FROM, to,
    subject: "Link your P³ registration — verification code",
    html,
  });

  if (error) console.error("[email] Resend error (claim code):", error);
  else console.log(`[email] Sent claim code to ${to}`);
}
