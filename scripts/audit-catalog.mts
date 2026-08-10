/**
 * Read-only catalog audit: for every product, report image count and which of the
 * 9 custom spec metafields are populated. Also lists the current PRODUCT metafield
 * definitions (a definition with storefront PUBLIC_READ access is required for the
 * PDP to read the values). Run: node --env-file=.env.local --import tsx/esm scripts/audit-catalog.mts
 */
import "dotenv/config";
import { getAdminToken } from "../lib/shopify/admin-token";

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const API_VERSION = "2026-07";
const ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;
const ADMIN_TOKEN = await getAdminToken();

const SPEC_KEYS = [
  "uom", "pricing_tiers", "lead_time", "spec_sheet_url",
  "install_guide_url", "cad_file_url", "product_specs", "warranty", "msrp",
];

async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": ADMIN_TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

// 1. Metafield definitions (storefront access)
const defsData = await graphql<{
  metafieldDefinitions: { edges: Array<{ node: { key: string; namespace: string; type: { name: string }; access: { storefront: string | null } } }> };
}>(
  `query { metafieldDefinitions(first: 50, ownerType: PRODUCT, namespace: "custom") {
    edges { node { key namespace type { name } access { storefront } } }
  } }`,
);
const defs = defsData.metafieldDefinitions.edges.map((e) => e.node);
console.log(`\n=== PRODUCT metafield definitions (namespace "custom") ===`);
if (!defs.length) console.log("  (none — storefront will read NULL for every custom metafield)");
for (const d of defs) console.log(`  custom.${d.key.padEnd(18)} type=${d.type.name.padEnd(22)} storefront=${d.access.storefront ?? "—"}`);
const definedKeys = new Set(defs.map((d) => d.key));
console.log(`  missing defs: ${SPEC_KEYS.filter((k) => !definedKeys.has(k)).join(", ") || "(none)"}`);

// 2. Product-by-product image + metafield coverage
let after: string | null = null;
let total = 0, noImage = 0, noSpecs = 0;
const coverage: Record<string, number> = Object.fromEntries(SPEC_KEYS.map((k) => [k, 0]));
const sample: string[] = [];

do {
  const data: {
    products: {
      edges: Array<{ node: {
        title: string; handle: string; status: string;
        mediaCount: { count: number };
        metafields: { edges: Array<{ node: { key: string; value: string } }> };
      } }>;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  } = await graphql(
    `query Audit($after: String) {
      products(first: 50, after: $after, sortKey: TITLE) {
        edges { node {
          title handle status
          mediaCount { count }
          metafields(first: 20, namespace: "custom") { edges { node { key value } } }
        } }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    { after },
  );
  for (const { node } of data.products.edges) {
    total++;
    const imgs = node.mediaCount.count;
    if (imgs === 0) noImage++;
    const keys = new Set(node.metafields.edges.map((e) => e.node.key).filter((k) => SPEC_KEYS.includes(k)));
    for (const k of keys) coverage[k]++;
    if (keys.size === 0) noSpecs++;
    if (sample.length < 8) sample.push(`  ${node.handle.padEnd(42)} imgs=${imgs}  specs=${keys.size}/9 [${[...keys].join(",") || "none"}]`);
  }
  after = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
} while (after);

console.log(`\n=== Catalog coverage (${total} products) ===`);
console.log(`  products with NO image:      ${noImage}/${total}`);
console.log(`  products with NO spec fields: ${noSpecs}/${total}`);
console.log(`  per-metafield coverage:`);
for (const k of SPEC_KEYS) console.log(`    custom.${k.padEnd(18)} ${coverage[k]}/${total}`);
console.log(`\n=== sample rows ===`);
console.log(sample.join("\n"));
