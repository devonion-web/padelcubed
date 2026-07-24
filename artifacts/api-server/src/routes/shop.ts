import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { getUncachableStripeClient } from "../stripeClient.js";

const router = Router();

// ─── Product catalogue ────────────────────────────────────────────────────────
// Query synced Stripe data — no custom product tables needed.

router.get("/shop/products", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      WITH paginated AS (
        SELECT id, name, description, images, metadata, active, created
        FROM stripe.products
        WHERE active = true
        ORDER BY created DESC
      )
      SELECT
        p.id           AS product_id,
        p.name         AS product_name,
        p.description  AS product_description,
        p.images       AS product_images,
        p.metadata     AS product_metadata,
        pr.id          AS price_id,
        pr.unit_amount,
        pr.currency,
        pr.active      AS price_active
      FROM paginated p
      LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
      ORDER BY p.created DESC, pr.unit_amount
    `);

    // Group prices under each product
    const map = new Map<string, {
      id: string; name: string; description: string | null;
      images: string[]; metadata: Record<string, string>;
      price: { id: string; unitAmount: number; currency: string } | null;
    }>();

    for (const row of rows.rows) {
      const pid = row.product_id as string;
      if (!map.has(pid)) {
        map.set(pid, {
          id: pid,
          name: row.product_name as string,
          description: row.product_description as string | null,
          images: (row.product_images as string[]) ?? [],
          metadata: (row.product_metadata as Record<string, string>) ?? {},
          price: null,
        });
      }
      // Take the first (lowest) active price
      if (row.price_id && !map.get(pid)!.price) {
        map.get(pid)!.price = {
          id: row.price_id as string,
          unitAmount: row.unit_amount as number,
          currency: row.currency as string,
        };
      }
    }

    res.json({ products: Array.from(map.values()) });
  } catch (err: any) {
    console.error("shop/products error:", err);
    res.status(500).json({ error: "Failed to load products" });
  }
});

// ─── Checkout session ─────────────────────────────────────────────────────────
// One-time payment. Size is collected via Stripe's custom_fields so it appears
// on the order receipt and in the Stripe dashboard.

router.post("/shop/checkout", async (req, res) => {
  const { priceId, size } = req.body as { priceId: string; size?: string };

  if (!priceId) {
    return res.status(400).json({ error: "priceId is required" });
  }

  try {
    const stripe = await getUncachableStripeClient();

    // Build the return URLs from the origin header so it works across dev / prod.
    const origin =
      req.headers.origin ??
      `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/shop?order=success`,
      cancel_url: `${origin}/shop?order=cancelled`,
      // Collect size via Stripe's built-in custom fields
      custom_fields: size
        ? undefined  // already chosen; pass as metadata instead
        : [
            {
              key: "size",
              label: { type: "custom", custom: "Size (S / M / L / XL / XXL)" },
              type: "text",
            },
          ],
      metadata: size ? { size } : {},
    };

    // If size was pre-selected in the UI, skip the custom field and embed in metadata
    if (size) {
      delete sessionParams.custom_fields;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.json({ url: session.url });
  } catch (err: any) {
    console.error("shop/checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

export default router;
