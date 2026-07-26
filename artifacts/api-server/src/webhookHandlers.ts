import { getStripeSync, getUncachableStripeClient } from './stripeClient.js';
import { db, bookingsTable, eventsTable, walkinsTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { sendBookingConfirmation } from './email.js';
import { enqueueWebhook } from './lib/webhookService.js';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    // ── 1. Custom logic — runs before stripeSync ───────────────────────────────
    try {
      const rawEvent = JSON.parse(payload.toString('utf8'));
      if (rawEvent.type === 'checkout.session.completed') {
        await WebhookHandlers.handleCheckoutComplete(rawEvent.data?.object);
      }
    } catch (err) {
      console.error('[webhook] Custom handler error:', err);
    }

    // ── 2. stripe-replit-sync — keeps stripe schema tables up to date ──────────
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }

  private static async handleCheckoutComplete(session: any): Promise<void> {
    if (!session?.id) return;

    const sessionId: string = session.id;
    const meta = session.metadata ?? {};

    // ── Admin on-site charge ───────────────────────────────────────────────────
    if (meta.adminCharge === 'true') {
      if (meta.walkinId) {
        const id = parseInt(meta.walkinId, 10);
        if (!isNaN(id)) {
          await db.update(walkinsTable).set({ paid: true }).where(eq(walkinsTable.id, id));
        }
      } else if (meta.bookingId) {
        const id = parseInt(meta.bookingId, 10);
        if (!isNaN(id)) {
          await db
            .update(bookingsTable)
            .set({ paymentStatus: 'paid' })
            .where(eq(bookingsTable.id, id));
        }
      }
      return;
    }

    // ── Standard web booking checkout ──────────────────────────────────────────
    const { eventId, email, fullName, company, memberId: memberIdStr } = meta;
    const memberId = memberIdStr ? parseInt(memberIdStr, 10) : null;
    if (!eventId || !email) return;

    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.stripeSessionId, sessionId));

    if (!booking) {
      console.warn(`[webhook] No booking found for session ${sessionId}`);
      return;
    }

    // ── Idempotency: skip if already marked paid ───────────────────────────────
    if (booking.paymentStatus === 'paid') {
      return; // Already processed — do not re-send confirmation email
    }

    await db
      .update(bookingsTable)
      .set({
        paymentStatus: 'paid',
        status: 'confirmed',
        ...(memberId && !isNaN(memberId) ? { memberId } : {}),
      })
      .where(eq(bookingsTable.id, booking.id));

    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, eventId));

    if (!event) return;

    // Send confirmation email (now idempotent — only fires if status was not 'paid')
    sendBookingConfirmation({
      to:            email,
      name:          fullName ?? email,
      eventId:       event.id,
      bookingId:     booking.id,
      eventTitle:    event.title,
      eventDate:     event.date,
      eventTime:     event.time,
      eventVenue:    event.venue,
      eventLocation: event.location,
      eventFormat:   event.format,
    }).catch(err => console.error('[email] Post-payment confirmation failed:', err));

    // Enqueue outbound webhook — async, never blocks this handler
    enqueueWebhook('booking.paid', {
      booking: {
        id:               booking.id,
        eventId:          event.id,
        eventTitle:       event.title,
        eventDate:        event.date,
        amountPaidPence:  event.pricePence,
      },
      member: { name: fullName ?? '', email },
    }).catch(err => console.error('[webhook] Enqueue error after booking.paid:', err));
  }
}
