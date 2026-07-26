/**
 * Stripe test helpers.
 *
 * generateStripeHeader: produce a valid Stripe-Signature header for a JSON
 * payload using stripe.webhooks.generateTestHeaderString — the official SDK
 * method. Never fabricates signatures manually.
 *
 * makeCheckoutCompletedPayload: build a minimal checkout.session.completed
 * event object matching the shape expected by webhookHandlers.ts.
 */

import Stripe from "stripe";

function stripeTestClient(): Stripe {
  // The secret key value does not matter for test header generation;
  // only the webhook secret (used below) is relevant for verification.
  return new Stripe("sk_test_placeholder_not_used_for_header_gen", {
    apiVersion: "2025-05-28.basil",
  });
}

/**
 * Generate a valid Stripe-Signature header string for the given payload.
 * @param payload - raw JSON string (the exact bytes that will be sent)
 * @param secret  - webhook secret (defaults to STRIPE_WEBHOOK_SECRET env var)
 */
export function generateStripeHeader(
  payload: string,
  secret = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_test_placeholder_for_tests_only",
): string {
  const stripe = stripeTestClient();
  return stripe.webhooks.generateTestHeaderString({ payload, secret });
}

/**
 * Build a minimal `checkout.session.completed` session object for testing.
 */
export function makeCheckoutSession(opts: {
  sessionId:   string;
  eventId:     string;
  email:       string;
  fullName:    string;
  company?:    string;
  memberId?:   number | null;
  adminCharge?: boolean;
  walkinId?:   number;
  bookingId?:  number;
}): Record<string, unknown> {
  const meta: Record<string, string> = {
    eventId:  opts.eventId,
    email:    opts.email,
    fullName: opts.fullName,
    company:  opts.company ?? "",
  };
  if (opts.memberId != null) meta.memberId = String(opts.memberId);
  if (opts.adminCharge)      meta.adminCharge = "true";
  if (opts.walkinId != null) meta.walkinId = String(opts.walkinId);
  if (opts.bookingId != null) meta.bookingId = String(opts.bookingId);

  return {
    id:       opts.sessionId,
    object:   "checkout.session",
    metadata: meta,
  };
}

/**
 * Wrap a session in a full checkout.session.completed event envelope.
 */
export function makeCheckoutCompletedEvent(
  session: Record<string, unknown>,
): string {
  return JSON.stringify({
    id:   `evt_test_${Date.now()}`,
    type: "checkout.session.completed",
    data: { object: session },
  });
}
