import "dotenv/config";
import { COLLECTIONS as C0, PRODUCTS as P0 } from './catalog-chunks/wire.mts';
import { COLLECTIONS as C1, PRODUCTS as P1 } from './catalog-chunks/conduit.mts';
import { COLLECTIONS as C2, PRODUCTS as P2 } from './catalog-chunks/devices.mts';
import { COLLECTIONS as C3, PRODUCTS as P3 } from './catalog-chunks/panels.mts';
import { COLLECTIONS as C4, PRODUCTS as P4 } from './catalog-chunks/lighting.mts';
import { COLLECTIONS as C5, PRODUCTS as P5 } from './catalog-chunks/lowvoltage.mts';
import { COLLECTIONS as C6, PRODUCTS as P6 } from './catalog-chunks/industrial.mts';
import { COLLECTIONS as C7, PRODUCTS as P7 } from './catalog-chunks/tools.mts';
import { getAdminToken } from "../lib/shopify/admin-token";

const ALL_COLLECTIONS = [...C0,...C1,...C2,...C3,...C4,...C5,...C6,...C7];
const ALL_PRODUCTS    = [...P0,...P1,...P2,...P3,...P4,...P5,...P6,...P7];

// ─── Boilerplate (copied from shopify-seed-v2.mts) ───────────────────────────

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? "headless-b2b-demo.myshopify.com";
const ADMIN_TOKEN = await getAdminToken();
const API_VERSION = "2026-07";
const ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

if (!ADMIN_TOKEN) {
  console.error("❌ SHOPIFY_ADMIN_API_TOKEN is not set. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": ADMIN_TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json() as { data: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json.data;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── Types ────────────────────────────────────────────────────────────────────

type CollectionRow = { title: string; handle: string; description: string; parentCategory: string };
type ProductRow = { title: string; vendor: string; collection: string; sku: string; price: string; compareAtPrice: string | null; uom: string; descriptionHtml: string; tags: string[]; pricingTiers: Array<{minQty:number;unitPrice:number}> | null };

const colTitleMap = Object.fromEntries((ALL_COLLECTIONS as CollectionRow[]).map(c => [c.handle, c.title]));

// ─── createCollections() ──────────────────────────────────────────────────────

async function createCollections(): Promise<Record<string, string>> {
  console.log("\n📂 Creating collections...");
  const ids: Record<string, string> = {};
  for (const col of ALL_COLLECTIONS as CollectionRow[]) {
    const data = await graphql<{ collectionCreate: { collection: { id: string; handle: string } | null; userErrors: Array<{ message: string }> } }>(
      `mutation C($input: CollectionInput!) { collectionCreate(input: $input) { collection { id handle } userErrors { message } } }`,
      { input: { title: col.title, descriptionHtml: col.description } }
    );
    if (data.collectionCreate.collection) {
      ids[col.handle] = data.collectionCreate.collection.id;
      console.log("  ✓", col.title);
    } else {
      const msg = data.collectionCreate.userErrors.map(e => e.message).join(", ");
      console.warn("  ⚠", col.title, msg);
    }
    await sleep(400);
  }
  return ids;
}

// ─── getLocationId() ─────────────────────────────────────────────────────────

async function getLocationId(): Promise<string> {
  const d = await graphql<{ locations: { edges: Array<{ node: { id: string } }> } }>(`query { locations(first:1) { edges { node { id } } } }`);
  return d.locations.edges[0]?.node.id ?? "";
}

// ─── createProducts() ────────────────────────────────────────────────────────

async function createProducts(colIds: Record<string, string>, locationId: string): Promise<void> {
  console.log("\n📦 Creating", ALL_PRODUCTS.length, "products...");
  let count = 0;
  for (const p of ALL_PRODUCTS as ProductRow[]) {
    const metafields: Array<{ namespace: string; key: string; value: string; type: string }> = [
      { namespace: "custom", key: "uom", value: p.uom, type: "single_line_text_field" },
      { namespace: "custom", key: "spec_sheet_url", value: "/specs/" + p.sku.toLowerCase() + ".pdf", type: "single_line_text_field" },
    ];
    if (p.pricingTiers) metafields.push({ namespace: "custom", key: "pricing_tiers", value: JSON.stringify(p.pricingTiers), type: "json" });

    const created = await graphql<{ productCreate: { product: { id: string; variants: { edges: Array<{ node: { id: string; inventoryItem: { id: string } } }> } } | null; userErrors: Array<{ message: string }> } }>(
      `mutation CreateProduct($input: ProductInput!) { productCreate(input: $input) { product { id variants(first:1) { edges { node { id inventoryItem { id } } } } } userErrors { field message } } }`,
      { input: { title: p.title, vendor: p.vendor, productType: colTitleMap[p.collection] ?? "", tags: p.tags, status: "ACTIVE", metafields } }
    ).catch(() => null);
    if (!created?.productCreate.product) { console.warn("  ⚠ Skip:", p.title); await sleep(350); continue; }

    const productId = created.productCreate.product.id;
    const variant = created.productCreate.product.variants.edges[0]?.node;
    if (variant) {
      await graphql(`mutation UV($pid:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$pid,variants:$v){userErrors{message}}}`,
        { pid: productId, v: [{ id: variant.id, sku: p.sku, price: p.price, compareAtPrice: p.compareAtPrice ?? null, inventoryItem: { tracked: true } }] }).catch(() => null);
      if (locationId && variant.inventoryItem?.id) {
        await graphql(`mutation AI($input:InventoryAdjustQuantitiesInput!){inventoryAdjustQuantities(input:$input){userErrors{message}}}`,
          { input: { reason: "correction", name: "available", changes: [{ delta: 150, inventoryItemId: variant.inventoryItem.id, locationId }] } }).catch(() => null);
      }
    }
    const colId = colIds[p.collection];
    if (colId) await graphql(`mutation AC($id:ID!,$pids:[ID!]!){collectionAddProducts(id:$id,productIds:$pids){userErrors{message}}}`,
      { id: colId, pids: [productId] }).catch(() => null);

    count++;
    if (count % 10 === 0) console.log("  Progress:", count, "/", ALL_PRODUCTS.length);
    await sleep(350);
  }
  console.log("  ✓ Created", count, "products");
}

// ─── main() ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱 Shopify B2B Catalog Expansion Seed\n");
  const colIds = await createCollections();
  const locationId = await getLocationId();
  await createProducts(colIds, locationId);
  console.log("\n✅ Done!\n");
}

main().catch(e => { console.error(e); process.exit(1); });
