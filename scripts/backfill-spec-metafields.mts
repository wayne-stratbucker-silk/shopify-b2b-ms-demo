/**
 * Complete the product spec data model. The core spec metafields (product_specs,
 * uom, warranty, msrp, lead_time, spec_sheet_url) are already 126/126, but three
 * are only partially populated:
 *   - custom.pricing_tiers     (json)  — B2B quantity price breaks
 *   - custom.install_guide_url (text)  — installation guide document link
 *   - custom.cad_file_url      (text)  — CAD drawing link
 *
 * This fills the gaps so every product has a fully built-out model:
 *   - pricing_tiers:     ALL products — 3 quantity breaks derived from the variant
 *                        price (bigger breaks / deeper discounts on cheaper parts).
 *   - install_guide_url: ALL products — /guides/<handle>-install.pdf (demo stub).
 *   - cad_file_url:      EQUIPMENT categories only (panels, enclosures/boxes,
 *                        fixtures, transformers, motors, industrial controls) —
 *                        /cad/<handle>.dwg. Wire, fittings, tools, grounding etc.
 *                        realistically have no CAD drawing, so they're left blank.
 *
 * Only null fields are written (idempotent), via metafieldsSet. Values already set
 * by the original seed are preserved.
 *
 * Run: npm run seed:specs   (add --all-cad to also give every product a cad_file_url)
 */
import "dotenv/config";
import { getAdminToken } from "../lib/shopify/admin-token";

const ENDPOINT = `https://${process.env.SHOPIFY_STORE_DOMAIN!}/admin/api/2026-07/graphql.json`;
const TOKEN = await getAdminToken();
const ALL_CAD = process.argv.includes("--all-cad");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function gql<T>(query: string, variables?: Record<string, unknown>, tries = 5): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN },
      body: JSON.stringify({ query, variables }),
    });
    const json = (await res.json()) as { data: T; errors?: Array<{ message: string; extensions?: { code?: string } }> };
    if (json.errors?.some((e) => e.extensions?.code === "THROTTLED") && attempt < tries) { await sleep(1000 * attempt); continue; }
    if (json.errors?.length) throw new Error(JSON.stringify(json.errors));
    return json.data;
  }
}

const EQUIPMENT_CATEGORIES = new Set([
  "Breakers & Panels", "Enclosures & Boxes", "Lighting Fixtures",
  "Transformers", "Motors & Motor Controls", "Industrial Controls",
]);

/** 3 quantity price breaks derived from unit price; cheaper parts break in larger
 *  quantities at deeper discounts, matching the existing seed's feel. */
function pricingTiers(price: number): string {
  const round = (n: number) => Math.round(n * 100) / 100;
  let breaks: number[], discounts: number[];
  if (price < 5) { breaks = [10, 25, 50]; discounts = [0.08, 0.14, 0.20]; }
  else if (price < 25) { breaks = [5, 10, 25]; discounts = [0.06, 0.11, 0.16]; }
  else { breaks = [3, 6, 12]; discounts = [0.05, 0.09, 0.14]; }
  return JSON.stringify(breaks.map((minQty, i) => ({ minQty, unitPrice: round(price * (1 - discounts[i])) })));
}

interface P { id: string; handle: string; productType: string; price: number; has: Set<string> }
async function allProducts(): Promise<P[]> {
  const out: P[] = [];
  let after: string | null = null;
  do {
    const d: {
      products: {
        edges: Array<{ node: {
          id: string; handle: string; productType: string;
          variants: { edges: Array<{ node: { price: string } }> };
          metafields: { edges: Array<{ node: { key: string; value: string } }> };
        } }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } = await gql(
      `query($after:String){products(first:100,after:$after,sortKey:TITLE){
        edges{node{
          id handle productType
          variants(first:1){edges{node{price}}}
          metafields(first:20,namespace:"custom"){edges{node{key value}}}
        }}
        pageInfo{hasNextPage endCursor}}}`,
      { after },
    );
    for (const e of d.products.edges) {
      const has = new Set(e.node.metafields.edges.filter((m) => m.node.value?.trim()).map((m) => m.node.key));
      out.push({ id: e.node.id, handle: e.node.handle, productType: e.node.productType, price: parseFloat(e.node.variants.edges[0]?.node.price ?? "0"), has });
    }
    after = d.products.pageInfo.hasNextPage ? d.products.pageInfo.endCursor : null;
  } while (after);
  return out;
}

async function setMetafields(batch: Array<{ ownerId: string; key: string; type: string; value: string }>): Promise<void> {
  const d = await gql<{ metafieldsSet: { userErrors: Array<{ field: string[]; message: string }> } }>(
    `mutation($metafields:[MetafieldsSetInput!]!){
      metafieldsSet(metafields:$metafields){ userErrors{ field message } }
    }`,
    { metafields: batch.map((m) => ({ ownerId: m.ownerId, namespace: "custom", key: m.key, type: m.type, value: m.value })) },
  );
  if (d.metafieldsSet.userErrors.length) console.warn(`  ⚠ ${JSON.stringify(d.metafieldsSet.userErrors)}`);
}

const products = await allProducts();
const updates: Array<{ ownerId: string; key: string; type: string; value: string }> = [];
const counts = { pricing_tiers: 0, install_guide_url: 0, cad_file_url: 0 };

for (const p of products) {
  if (!p.has.has("pricing_tiers") && p.price > 0) {
    updates.push({ ownerId: p.id, key: "pricing_tiers", type: "json", value: pricingTiers(p.price) });
    counts.pricing_tiers++;
  }
  if (!p.has.has("install_guide_url")) {
    updates.push({ ownerId: p.id, key: "install_guide_url", type: "single_line_text_field", value: `/guides/${p.handle}-install.pdf` });
    counts.install_guide_url++;
  }
  const wantsCad = ALL_CAD || EQUIPMENT_CATEGORIES.has(p.productType);
  if (!p.has.has("cad_file_url") && wantsCad) {
    updates.push({ ownerId: p.id, key: "cad_file_url", type: "single_line_text_field", value: `/cad/${p.handle}.dwg` });
    counts.cad_file_url++;
  }
}

console.log(`${products.length} products. Writing: pricing_tiers=${counts.pricing_tiers}, install_guide_url=${counts.install_guide_url}, cad_file_url=${counts.cad_file_url} (${updates.length} metafields)\n`);

for (let i = 0; i < updates.length; i += 25) {
  const batch = updates.slice(i, i + 25);
  await setMetafields(batch);
  console.log(`  set ${Math.min(i + 25, updates.length)}/${updates.length}`);
  await sleep(200);
}
console.log(`\n✅ Spec metafields completed.`);
