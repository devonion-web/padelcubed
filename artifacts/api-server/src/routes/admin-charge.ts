import { Router } from "express";
import { z } from "zod";
import { db, eventsTable, walkinsTable, bookingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middleware/adminAuth.js";
import { getUncachableStripeClient } from "../stripeClient.js";

const router = Router();

// ─── POST /admin/events/:eventId/charge ──────────────────────────────────────
// Creates a Stripe Checkout Session for on-site payment of a walk-in or booking.

const ChargeBody = z.object({
  walkinId: z.number().int().positive().optional(),
  bookingId: z.number().int().positive().optional(),
}).refine((d) => d.walkinId !== undefined || d.bookingId !== undefined, {
  message: "Either walkinId or bookingId is required",
});

router.post("/admin/events/:eventId/charge", requireAdmin, async (req, res): Promise<void> => {
  const { eventId } = req.params;
  const parsed = ChargeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { walkinId, bookingId } = parsed.data;

  try {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }

    const amountPence = event.pricePence ?? 0;
    if (!amountPence) { res.status(400).json({ error: "This event has no price set" }); return; }

    // Look up player name/email for the session description
    let playerName = "Player";
    let playerEmail: string | null = null;
    if (walkinId) {
      const [w] = await db.select().from(walkinsTable).where(eq(walkinsTable.id, walkinId));
      if (!w) { res.status(404).json({ error: "Walk-in not found" }); return; }
      playerName = w.name;
      playerEmail = w.email;
    } else if (bookingId) {
      const [b] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId!));
      if (!b) { res.status(404).json({ error: "Booking not found" }); return; }
      playerName = b.fullName;
      playerEmail = b.email;
    }

    const stripe = await getUncachableStripeClient();

    // Reuse the cached price ID if available, otherwise create an ad-hoc price
    let priceId = event.stripePriceId;
    if (!priceId) {
      const product = await stripe.products.create({
        name: event.title,
        metadata: { eventId: event.id },
      });
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: amountPence,
        currency: "gbp",
      });
      priceId = price.id;
      await db.update(eventsTable).set({ stripePriceId: priceId }).where(eq(eventsTable.id, eventId));
    }

    const origin = `https://${process.env.REPLIT_DOMAINS?.split(",")[0] ?? "padelcubed.com"}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/?admin_charge=success`,
      cancel_url:  `${origin}/?admin_charge=cancelled`,
      customer_email: playerEmail ?? undefined,
      metadata: {
        eventId,
        adminCharge: "true",
        walkinId:  walkinId  ? String(walkinId)  : "",
        bookingId: bookingId ? String(bookingId) : "",
        playerName,
      },
    });

    res.json({ url: session.url, sessionId: session.id, amountPence, currency: "gbp" });
  } catch (err) {
    console.error("[admin-charge] Error:", err);
    res.status(500).json({ error: "Failed to create charge session" });
  }
});

// ─── GET /admin/charge-status/:sessionId ─────────────────────────────────────
// Poll Stripe for the current payment status of a charge session.

router.get("/admin/charge-status/:sessionId", requireAdmin, async (req, res): Promise<void> => {
  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    const paid = session.payment_status === "paid";
    res.json({ status: session.status, paymentStatus: session.payment_status, paid });
  } catch (err) {
    console.error("[admin-charge] Status check error:", err);
    res.status(500).json({ error: "Failed to check charge status" });
  }
});

export default router;
