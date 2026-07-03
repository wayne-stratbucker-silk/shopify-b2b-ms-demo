/**
 * Seed sample product reviews into product metafields (namespace "reviews":
 * rating / count / items). Deterministic per product. Run: npm run seed:reviews
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? "makeswift-b2b-demo.myshopify.com";
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN ?? "";
const API_VERSION = "2025-04";
const ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;
const LIMIT = parseInt(process.env.REVIEW_LIMIT ?? "20", 10);

if (!ADMIN_TOKEN) { console.error("SHOPIFY_ADMIN_API_TOKEN is not set"); process.exit(1); }

const POOL = [
  { author: "Dave R., Facilities Mgr", rating: 5, title: "Exactly as specced", body: "Showed up next day and matched the datasheet perfectly. Ordering more for the next job." },
  { author: "Maria G., Procurement", rating: 4, title: "Solid, good value", body: "Quality is what we expect at this price. Docked one star for lead time on the last batch." },
  { author: "Tom B., Master Electrician", rating: 5, title: "Field-proven", body: "We've installed dozens of these. Zero callbacks. Would recommend to any contractor." },
  { author: "Priya S., Plant Engineer", rating: 4, title: "Works as intended", body: "Fit our panel without modification. Documentation could be a little clearer." },
  { author: "Carl W., Buyer", rating: 5, title: "Great account support", body: "Our rep helped us spec the right variant. Pricing on our contract is competitive." },
];

async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": ADMIN_TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(`GraphQL: ${json.errors.map((e) => e.message).join(", ")}`);
  return json.data;
}

async function run() {
  const data = await graphql<{ products: { edges: Array<{ node: { id: string; title: string } }> } }>(
    `query Products($n: Int!) { products(first: $n, sortKey: TITLE) { edges { node { id title } } } }`,
    { n: LIMIT },
  );
  const products = data.products.edges.map((e) => e.node);
  console.log(`Seeding reviews for ${products.length} products...\n`);

  // Deterministic day offset per review (no Date.now — reproducible).
  const base = Date.parse("2026-05-01T00:00:00Z");

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const n = 2 + (i % 3); // 2–4 reviews
    const items = Array.from({ length: n }, (_, k) => {
      const t = POOL[(i + k) % POOL.length];
      return { ...t, date: new Date(base - (i * 3 + k) * 86_400_000).toISOString().slice(0, 10) };
    });
    const rating = Math.round((items.reduce((s, r) => s + r.rating, 0) / n) * 10) / 10;

    const res = await graphql<{ metafieldsSet: { userErrors: Array<{ message: string }> } }>(
      `mutation SetReviews($mf: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $mf) { userErrors { field message } }
      }`,
      {
        mf: [
          { ownerId: p.id, namespace: "reviews", key: "rating", type: "number_decimal", value: String(rating) },
          { ownerId: p.id, namespace: "reviews", key: "count", type: "number_integer", value: String(n) },
          { ownerId: p.id, namespace: "reviews", key: "items", type: "json", value: JSON.stringify(items) },
        ],
      },
    );
    const errs = res.metafieldsSet.userErrors;
    if (errs.length) console.warn(`  ! ${p.title}: ${errs.map((e) => e.message).join(", ")}`);
    else console.log(`  ✓ ${p.title} — ${n} reviews, ${rating}★`);
  }
  console.log("\nDone.");
}

run().catch((e) => { console.error(e); process.exit(1); });
