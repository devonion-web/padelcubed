import { getStripeSync, getUncachableStripeClient } from './stripeClient.js';
import { db, bookingsTable, eventsTable } from '@workspace/db';
import { and, eq } from 'drizzle-orm';
import { sendBookingConfirmation } from './email.js';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    // ── 1. Custom logic — runs before stripeSync so we can act on events ──────
    try {
      const rawEvent = JSON.parse(payload.toString('utf8'));

      if (rawEvent.type === 'checkout.session.completed') {
        await WebhookHandlers.handleCheckoutComplete(rawEvent.data?.object);
      }
    } catch (err) {
      // Never block the webhook response for custom handler errors
      console.error('[webhook] Custom handler error:', err);
    }

    // ── 2. stripe-replit-sync — keeps the stripe schema tables up to date ─────
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }

  // ── Handle checkout.session.completed ───────────────────────────────────────
  private static async handleCheckoutComplete(session: any): Promise<void> {
    if (!session?.id) return;

    const sessionId: string = session.id;
    const meta = session.metadata ?? {};
    const { eventId, email, fullName, company } = meta;

    if (!eventId || !email) {
      // Not one of our event bookings — ignore
      return;
    }

    // Find the pending booking by session ID
    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.stripeSessionId, sessionId));

    if (!booking) {
      console.warn(`[webhook] No booking found for session ${sessionId}`);
      return;
    }

    // Mark as paid + confirmed
    await db
      .update(bookingsTable)
      .set({ paymentStatus: 'paid', status: 'confirmed' })
      .where(eq(bookingsTable.id, booking.id));

    // Fetch event for the confirmation email
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, eventId));

    if (!event) return;

    sendBookingConfirmation({
      to: email,
      name: fullName ?? email,
      eventId: event.id,
      bookingId: booking.id,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      eventVenue: event.venue,
      eventLocation: event.location,
      eventFormat: event.format,
    }).catch((err) => console.error('[email] Post-payment confirmation failed:', err));

    console.log(`[webhook] Booking ${booking.id} marked paid for session ${sessionId}`);
  }
}
