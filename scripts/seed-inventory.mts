// Seed demo inventory: set on-hand = QTY for every tracked variant at the
// primary location. The catalog was created without stock, so the storefront
// reports availableForSale:false everywhere. Run once to make the demo shoppable.
//
//   node --env-file=.env.local --import tsx/esm scripts/seed-inventory.mts [qty]

import { getAdminToken } from "../lib/shopify/admin-token";

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const API_VERSION = "2026-07";
const ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;
const QTY = Number(process.argv[2]) || 250;

const token = await getAdminToken();

async function admin<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data as T;
}

// 1. Pick the target location — prefer "Shop location", else first active.
const locData = await admin<{ locations: { edges: Array<{ node: { id: string; name: string; isActive: boolean } }> } }>(
  `query { locations(first: 10) { edges { node { id name isActive } } } }`,
);
const locations = locData.locations.edges.map((e) => e.node);
const loc = locations.find((l) => l.name === "Shop location" && l.isActive)
  ?? locations.find((l) => l.isActive) ?? locations[0];
if (!loc) throw new Error("No location found");
console.log(`Target location: ${loc.name} (${loc.id})`);

// 2. Collect all tracked inventory items + their current on-hand at the location
//    (needed as `changeFromQuantity` for the set mutation).
type Item = { id: string; onHand: number };
const items: Item[] = [];
let cursor: string | null = null;
let page = 0;
do {
  const data: { products: { pageInfo: { hasNextPage: boolean; endCursor: string }; edges: Array<{ node: { variants: { edges: Array<{ node: { inventoryItem: { id: string; tracked: boolean; inventoryLevel: { quantities: Array<{ name: string; quantity: number }> } | null } | null } }> } } }> } } =
    await admin(
      `query($cursor: String, $locId: ID!) {
        products(first: 50, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          edges { node { variants(first: 100) { edges { node {
            inventoryItem {
              id tracked
              inventoryLevel(locationId: $locId) { quantities(names: ["available"]) { name quantity } }
            }
          } } } } }
        }
      }`,
      { cursor, locId: loc.id },
    );
  for (const pe of data.products.edges) {
    for (const ve of pe.node.variants.edges) {
      const it = ve.node.inventoryItem;
      if (!it?.id || !it.tracked) continue;
      const onHand = it.inventoryLevel?.quantities.find((q) => q.name === "available")?.quantity ?? 0;
      items.push({ id: it.id, onHand });
    }
  }
  cursor = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  page++;
  console.log(`  scanned page ${page} — ${items.length} tracked variants so far`);
} while (cursor);

const already = items.filter((i) => i.onHand >= QTY).length;
console.log(`\nSetting on-hand=${QTY} for ${items.length} tracked variants (${already} already >= ${QTY})…`);

// 3. Set quantities in batches.
const BATCH = 100;
let done = 0;
let errorCount = 0;
for (let i = 0; i < items.length; i += BATCH) {
  const batch = items.slice(i, i + BATCH);
  const data = await admin<{ inventorySetQuantities: { userErrors: Array<{ field: string[]; message: string }> } }>(
    `mutation($input: InventorySetQuantitiesInput!, $idempotencyKey: String!) {
      inventorySetQuantities(input: $input) @idempotent(key: $idempotencyKey) {
        userErrors { field message }
      }
    }`,
    {
      idempotencyKey: `seed-inv-${Date.now()}-${i}`,
      input: {
        name: "available",
        reason: "correction",
        quantities: batch.map((it) => ({
          inventoryItemId: it.id,
          locationId: loc.id,
          quantity: QTY,
          changeFromQuantity: it.onHand,
        })),
      },
    },
  );
  const ue = data.inventorySetQuantities.userErrors;
  if (ue?.length) {
    errorCount += ue.length;
    console.log(`  ⚠ userErrors: ${JSON.stringify(ue.slice(0, 3))}`);
  }
  done += batch.length;
  console.log(`  set ${done}/${items.length}`);
}

console.log(`\n✅ Done. on-hand=${QTY} for ${done} variants at ${loc.name}. userErrors: ${errorCount}`);
