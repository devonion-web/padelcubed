/**
 * Seed P³ apparel products into Stripe.
 *
 * Idempotent — checks for existing products before creating.
 * Run with: pnpm --filter @workspace/scripts exec tsx src/seed-products.ts
 */
import { getUncachableStripeClient } from './stripeClient.js';

const PRODUCTS = [
  {
    name: 'P³ Hoodie',
    description: 'Premium heavyweight hoodie in midnight navy. P³ embroidered chest logo, drop-shoulder fit. Made to be worn on court and straight to the bar.',
    unitAmount: 5500, // £55.00
    metadata: { category: 'apparel', sizes: 'S,M,L,XL,XXL' },
  },
  {
    name: 'P³ Padel Shirt',
    description: 'Lightweight performance polo with moisture-wicking fabric. Electric turquoise P³ logo. Designed for match play — looks the part doing it.',
    unitAmount: 3500, // £35.00
    metadata: { category: 'apparel', sizes: 'S,M,L,XL,XXL' },
  },
  {
    name: 'P³ Cap',
    description: 'Structured six-panel cap with embroidered P³ mark. Adjustable strap. One size fits all. The finishing touch to any court look.',
    unitAmount: 2500, // £25.00
    metadata: { category: 'apparel', sizes: 'One Size' },
  },
  {
    name: 'P³ Shorts',
    description: 'Technical padel shorts with quick-dry fabric and deep side pockets. P³ logo at hem. Built for the baseline, worn everywhere else.',
    unitAmount: 3000, // £30.00
    metadata: { category: 'apparel', sizes: 'S,M,L,XL,XXL' },
  },
];

async function seedProducts() {
  const stripe = await getUncachableStripeClient();
  console.log('🎾 Seeding P³ apparel products into Stripe...\n');

  for (const product of PRODUCTS) {
    // Idempotency check — search by exact name
    const existing = await stripe.products.search({
      query: `name:'${product.name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      console.log(`  ✓ Already exists: ${product.name} (${existing.data[0].id})`);
      continue;
    }

    const created = await stripe.products.create({
      name: product.name,
      description: product.description,
      metadata: product.metadata,
    });

    const price = await stripe.prices.create({
      product: created.id,
      unit_amount: product.unitAmount,
      currency: 'gbp',
    });

    console.log(`  + Created: ${product.name}`);
    console.log(`    Product ID : ${created.id}`);
    console.log(`    Price ID   : ${price.id}  (£${(product.unitAmount / 100).toFixed(2)})\n`);
  }

  console.log('✅ Done. Webhooks will sync these products to your database automatically.');
}

seedProducts().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
