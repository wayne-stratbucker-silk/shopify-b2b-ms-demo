/**
 * Publish all products to the Online Store + Headless sales channels.
 *
 * productCreate does not publish to any channel, so a freshly-seeded store's
 * products are invisible to the Storefront API (Headless channel) and Online
 * Store. Run this after seeding. Resolves publications by name, so it's
 * store-agnostic.
 *
 * Run: npm run publish:products
 */
import "dotenv/config";
import { getAdminToken } from "../lib/shopify/admin-token";

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const API_VERSION = "2026-07";
const ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;
const ADMIN_TOKEN = await getAdminToken();

async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": ADMIN_TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json.data;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Resolve target publications by name (Online Store + Headless).
const pubData = await graphql<{ publications: { edges: Array<{ node: { id: string; name: string } }> } }>(
  `{ publications(first: 25) { edges { node { id name } } } }`,
);
const targets = pubData.publications.edges
  .map((e) => e.node)
  .filter((p) => /online store|headless/i.test(p.name));
if (!targets.length) {
  console.error("❌ No 'Online Store' or 'Headless' publications found.");
  process.exit(1);
}
console.log(`Publishing to: ${targets.map((p) => p.name).join(", ")}`);
const input = targets.map((p) => ({ publicationId: p.id }));

// Page through products and publish each.
let cursor: string | null = null;
let count = 0;
let ok = 0;
do {
  const data = await graphql<{
    products: { edges: Array<{ cursor: string; node: { id: string; title: string } }>; pageInfo: { hasNextPage: boolean } };
  }>(
    `query ($after: String) {
      products(first: 50, after: $after, sortKey: ID) {
        edges { cursor node { id title } }
        pageInfo { hasNextPage }
      }
    }`,
    { after: cursor },
  );
  for (const { node } of data.products.edges) {
    count++;
    const res = await graphql<{ publishablePublish: { userErrors: Array<{ message: string }> } }>(
      `mutation Pub($id: ID!, $input: [PublicationInput!]!) {
        publishablePublish(id: $id, input: $input) { userErrors { message } }
      }`,
      { id: node.id, input },
    );
    const errs = res.publishablePublish.userErrors;
    if (errs.length) console.warn(`  ⚠ ${node.title}: ${errs.map((e) => e.message).join(", ")}`);
    else ok++;
    await sleep(80);
  }
  const edges = data.products.edges;
  cursor = data.products.pageInfo.hasNextPage ? edges[edges.length - 1].cursor : null;
  console.log(`  ...${count} processed`);
} while (cursor);

console.log(`✅ Published ${ok}/${count} products to ${targets.map((p) => p.name).join(" + ")}`);
