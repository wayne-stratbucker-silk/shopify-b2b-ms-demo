import { getAdminToken } from "../lib/shopify/admin-token";
/**
 * Acme Electric Supply — Test Order Seeder
 *
 * Creates 17 historical test orders for "wayne" and "alice" under Acme Electric Supply.
 * Orders vary in size (small/medium/large), age (1 week to 24 months ago), and status.
 *
 * Run: npm run seed:orders:acme
 * Prerequisites: wayne and alice must already exist as Shopify customers.
 *   If not found, run `npm run seed:v2` first to create company contacts,
 *   or create them manually in Shopify Admin.
 */

// ─── SECTION A — Boilerplate ──────────────────────────────────────────────────

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? "headless-b2b-demo.myshopify.com";
const ADMIN_TOKEN = await getAdminToken();
const API_VERSION = "2026-07";
const GQL_URL = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;
const REST_URL = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/orders.json`;

if (!ADMIN_TOKEN) {
  console.error("❌ SHOPIFY_ADMIN_API_TOKEN is not set. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": ADMIN_TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json() as { data: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  return json.data;
}

async function restOrder(body: unknown): Promise<{ order: { name: string; id: number } } | null> {
  const r = await fetch(REST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": ADMIN_TOKEN },
    body: JSON.stringify(body),
  });
  if (!r.ok) { console.warn("  REST order failed:", (await r.text()).slice(0, 300)); return null; }
  return r.json();
}

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

// ─── SECTION B — Types ────────────────────────────────────────────────────────

interface VariantInfo {
  variantId: number;
  title: string;
}

interface CustomerInfo {
  numericId: number;
  gid: string;
  displayName: string;
  email: string;
}

type FinancialStatus = "paid" | "pending" | "partially_refunded";

interface OrderTemplate {
  label: string;
  customer: "wayne" | "alice";
  variantIndices: number[];
  quantities: number[];
  financialStatus: FinancialStatus;
  fulfillmentStatus: "fulfilled" | null;
  monthsAgo: number;
  poSuffix: string;
  note: string;
}

// ─── SECTION C — ORDER_TEMPLATES ─────────────────────────────────────────────

const ORDER_TEMPLATES: OrderTemplate[] = [
  // ── SMALL (2–3 line items) ────────────────────────────────────────────────
  {
    label: "Lincoln Sq Residential Rough-In",
    customer: "wayne",
    variantIndices: [0, 4],
    quantities: [25, 10],
    financialStatus: "paid", fulfillmentStatus: "fulfilled",
    monthsAgo: 0.25,
    poSuffix: "5501",
    note: "Phase 1 rough-in for 4-plex on Lincoln Square. Wire pull before insulation Friday.",
  },
  {
    label: "Wicker Park Bathroom GFCI Upgrade",
    customer: "alice",
    variantIndices: [17, 21],
    quantities: [20, 15],
    financialStatus: "paid", fulfillmentStatus: "fulfilled",
    monthsAgo: 1,
    poSuffix: "5502",
    note: "GFCI receptacle replacement per city inspection punch list, units 201-210.",
  },
  {
    label: "Pilsen Coffee Shop Lighting",
    customer: "wayne",
    variantIndices: [24, 27, 30],
    quantities: [8, 6, 12],
    financialStatus: "paid", fulfillmentStatus: "fulfilled",
    monthsAgo: 2,
    poSuffix: "5503",
    note: "Tenant fit-out — LED troffers and wall-pack for exterior. Match existing color temp.",
  },
  {
    label: "Evanston Office GFCI Service",
    customer: "alice",
    variantIndices: [10, 13],
    quantities: [18, 12],
    financialStatus: "paid", fulfillmentStatus: "fulfilled",
    monthsAgo: 3,
    poSuffix: "5504",
    note: "Upgrade 15A to 20A circuits in break room and server closet. Pull new 12/2 NM-B.",
  },
  {
    label: "Rogers Park Garage EV Charger Rough-In",
    customer: "wayne",
    variantIndices: [3, 7],
    quantities: [5, 8],
    financialStatus: "pending", fulfillmentStatus: null,
    monthsAgo: 0.25,
    poSuffix: "5505",
    note: "New 20A dedicated circuits for two EV charger rough-in points. Awaiting permit approval.",
  },
  {
    label: "Bridgeport Storefront Signage Circuit",
    customer: "alice",
    variantIndices: [6, 19],
    quantities: [10, 6],
    financialStatus: "paid", fulfillmentStatus: "fulfilled",
    monthsAgo: 5,
    poSuffix: "5506",
    note: "New dedicated 20A circuit for illuminated storefront signage. EMT run along parapet wall.",
  },

  // ── MEDIUM (4–5 line items) ───────────────────────────────────────────────
  {
    label: "Bucktown Condo Reno Electrical",
    customer: "wayne",
    variantIndices: [1, 5, 9, 23],
    quantities: [50, 30, 4, 10],
    financialStatus: "paid", fulfillmentStatus: "fulfilled",
    monthsAgo: 7,
    poSuffix: "5507",
    note: "Full gut rehab — floors 2 & 3. EMT conduit, THHN wire, breakers, and LED fixtures.",
  },
  {
    label: "Hyde Park University Lab Fit-Out",
    customer: "alice",
    variantIndices: [2, 8, 16, 29, 33],
    quantities: [40, 2, 20, 8, 4],
    financialStatus: "paid", fulfillmentStatus: "fulfilled",
    monthsAgo: 9,
    poSuffix: "5508",
    note: "Lab benches on 3rd floor need dedicated 20A isolated ground circuits. Coordinate with facilities.",
  },
  {
    label: "Lakeview Restaurant HVAC Disconnect",
    customer: "wayne",
    variantIndices: [11, 14, 22, 31],
    quantities: [60, 3, 6, 20],
    financialStatus: "paid", fulfillmentStatus: "fulfilled",
    monthsAgo: 12,
    poSuffix: "5509",
    note: "RTU replacement project — run new 60A disconnects and 10/3 MC cable to each rooftop unit.",
  },
  {
    label: "Ravenswood Brewery Panel Upgrade",
    customer: "alice",
    variantIndices: [0, 3, 12, 25, 38],
    quantities: [100, 50, 8, 15, 2],
    financialStatus: "partially_refunded", fulfillmentStatus: null,
    monthsAgo: 5,
    poSuffix: "5510",
    note: "200A panel upgrade for new fermentation room. Credit memo pending for 2 returned sub-panels.",
  },
  {
    label: "Norwood Park School Safety Lighting",
    customer: "wayne",
    variantIndices: [26, 29, 34, 36],
    quantities: [20, 10, 30, 30],
    financialStatus: "paid", fulfillmentStatus: "fulfilled",
    monthsAgo: 15,
    poSuffix: "5511",
    note: "Emergency exit and egress lighting replacement, all corridors. Must pass fire marshal re-inspection.",
  },
  {
    label: "Andersonville Mixed-Use New Construction",
    customer: "alice",
    variantIndices: [4, 18, 20, 32, 37],
    quantities: [75, 25, 35, 12, 40],
    financialStatus: "paid", fulfillmentStatus: "fulfilled",
    monthsAgo: 18,
    poSuffix: "5512",
    note: "New construction rough-in — 5-story mixed-use, 12 residential units above 2 retail bays.",
  },

  // ── LARGE (6–8 line items) ────────────────────────────────────────────────
  {
    label: "O'Hare Cargo Terminal Wire Pull",
    customer: "wayne",
    variantIndices: [0, 1, 2, 5, 9, 17, 28],
    quantities: [500, 200, 150, 100, 6, 40, 20],
    financialStatus: "paid", fulfillmentStatus: "fulfilled",
    monthsAgo: 22,
    poSuffix: "5513",
    note: "Airside cargo terminal expansion — 12 conduit runs to new freight bays. Night-shift access only.",
  },
  {
    label: "South Loop Hotel Retrofit Package",
    customer: "alice",
    variantIndices: [3, 6, 10, 22, 23, 26, 30, 33],
    quantities: [300, 150, 10, 15, 50, 20, 60, 8],
    financialStatus: "paid", fulfillmentStatus: "fulfilled",
    monthsAgo: 24,
    poSuffix: "5514",
    note: "Full floor-by-floor lighting and panel upgrade, 18 floors. Schedule with hotel engineering weekly.",
  },
  {
    label: "Cicero Manufacturing Floor Rewire",
    customer: "wayne",
    variantIndices: [1, 4, 7, 11, 16, 27],
    quantities: [400, 200, 80, 4, 30, 50],
    financialStatus: "paid", fulfillmentStatus: "fulfilled",
    monthsAgo: 18,
    poSuffix: "5515",
    note: "Production floor re-wire for CNC expansion. 480V 3-phase runs, new MCC feeder to panel E-3.",
  },
  {
    label: "Oak Park Library Renovation",
    customer: "alice",
    variantIndices: [2, 15, 19, 24, 31, 35, 39],
    quantities: [200, 4, 20, 30, 40, 25, 3],
    financialStatus: "paid", fulfillmentStatus: "fulfilled",
    monthsAgo: 12,
    poSuffix: "5516",
    note: "Daylight harvesting controls and LED troffer install, main reading room and children's wing.",
  },
  {
    label: "Rosemont Convention Center Phase 2",
    customer: "wayne",
    variantIndices: [0, 5, 8, 13, 17, 25, 32, 36],
    quantities: [500, 200, 3, 25, 60, 30, 20, 50],
    financialStatus: "pending", fulfillmentStatus: null,
    monthsAgo: 0.25,
    poSuffix: "5517",
    note: "Phase 2 convention hall — main distribution from service entrance to floor boxes. Awaiting GC schedule.",
  },
];

// ─── SECTION D — Customer Lookup ─────────────────────────────────────────────

async function lookupCustomer(firstName: string): Promise<CustomerInfo | null> {
  const data = await gql<{
    customers: {
      edges: Array<{
        node: { id: string; firstName: string; lastName: string; email: string; displayName: string }
      }>
    }
  }>(
    `query FindCustomer($q: String!) {
      customers(first: 5, query: $q) {
        edges { node { id firstName lastName email displayName } }
      }
    }`,
    { q: `first_name:${firstName}` }
  );

  const edges = data.customers.edges;
  if (!edges.length) return null;

  if (edges.length > 1) {
    console.warn(`  ⚠️  Found ${edges.length} customers named "${firstName}" — using first: ${edges[0].node.displayName} (${edges[0].node.email})`);
  }

  const node = edges[0].node;
  return {
    numericId: parseInt(node.id.split("/").pop() ?? "0", 10),
    gid: node.id,
    displayName: node.displayName,
    email: node.email,
  };
}

// ─── SECTION E — Variant Fetch ────────────────────────────────────────────────

async function fetchVariants(): Promise<VariantInfo[]> {
  const variants: VariantInfo[] = [];
  let cursor: string | null = null;

  do {
    const data = await gql<{
      products: {
        pageInfo: { hasNextPage: boolean; endCursor: string };
        edges: Array<{
          node: {
            title: string;
            variants: { edges: Array<{ node: { id: string } }> }
          }
        }>
      }
    }>(
      `query GetVariants($cursor: String) {
        products(first: 50, query: "tag:b2b-demo", after: $cursor) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              title
              variants(first: 1) {
                edges { node { id } }
              }
            }
          }
        }
      }`,
      { cursor }
    );

    for (const { node: product } of data.products.edges) {
      const variantNode = product.variants.edges[0]?.node;
      if (variantNode) {
        variants.push({
          variantId: parseInt(variantNode.id.split("/").pop() ?? "0", 10),
          title: product.title,
        });
      }
    }

    cursor = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (cursor);

  return variants;
}

// ─── SECTION F — Idempotency Check ───────────────────────────────────────────

async function fetchExistingPONumbers(): Promise<Set<string>> {
  const existing = new Set<string>();
  let cursor: string | null = null;

  do {
    const data = await gql<{
      orders: {
        pageInfo: { hasNextPage: boolean; endCursor: string };
        edges: Array<{ node: { name: string; poNumber: string | null } }>
      }
    }>(
      `query CheckAcmeOrders($cursor: String) {
        orders(first: 50, query: "tag:b2b-demo-acme", after: $cursor) {
          pageInfo { hasNextPage endCursor }
          edges { node { name poNumber } }
        }
      }`,
      { cursor }
    );

    for (const { node } of data.orders.edges) {
      if (node.poNumber) existing.add(node.poNumber);
    }

    cursor = data.orders.pageInfo.hasNextPage ? data.orders.pageInfo.endCursor : null;
  } while (cursor);

  return existing;
}

// ─── SECTION G — Order Creation ──────────────────────────────────────────────

// Dev stores allow ~5 orders/min via REST; 13s between creates keeps us safely under that limit.
const ORDER_DELAY_MS = 13_000;

async function createOrders(
  wayne: CustomerInfo,
  alice: CustomerInfo,
  variants: VariantInfo[],
  existingPOs: Set<string>
): Promise<void> {
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const t of ORDER_TEMPLATES) {
    const poNumber = `PO-ACME-${t.poSuffix}`;

    if (existingPOs.has(poNumber)) {
      console.log(`  – [${t.customer}] ${t.label} — skipped (${poNumber} already exists)`);
      skipped++;
      continue;
    }

    const customer = t.customer === "wayne" ? wayne : alice;

    const line_items = t.variantIndices.map((idx, i) => ({
      variant_id: variants[idx % variants.length].variantId,
      quantity: t.quantities[i] ?? 1,
    }));

    const monthMs = t.monthsAgo * 30 * 24 * 60 * 60 * 1000;
    const created_at = new Date(Date.now() - monthMs).toISOString();

    const orderBody: Record<string, unknown> = {
      customer: { id: customer.numericId },
      line_items,
      financial_status: t.financialStatus,
      created_at,
      processed_at: created_at,
      po_number: poNumber,
      note: `[Acme Electric Supply] ${t.note}`,
      tags: ["b2b-demo", "b2b-demo-acme"],
      inventory_behaviour: "bypass",
    };

    if (t.fulfillmentStatus !== null) {
      orderBody.fulfillment_status = t.fulfillmentStatus;
    }

    const result = await restOrder({ order: orderBody });

    if (result?.order?.name) {
      console.log(`  ✓ [${t.customer}] ${t.label} → ${result.order.name} (${t.financialStatus})`);
      created++;
    } else {
      console.warn(`  ✗ [${t.customer}] ${t.label} — FAILED`);
      failed++;
    }

    await sleep(ORDER_DELAY_MS);
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped, ${failed} failed.`);
}

// ─── SECTION H — Main ────────────────────────────────────────────────────────

async function main() {
  console.log("🔌 Acme Electric Supply — Order Seeder");
  console.log(`   Store: ${STORE_DOMAIN}`);
  console.log(`   Templates: ${ORDER_TEMPLATES.length} orders\n`);

  console.log("Checking for existing Acme orders (for resume/skip)...");
  const existingPOs = await fetchExistingPONumbers();
  if (existingPOs.size > 0) {
    console.log(`   Found ${existingPOs.size} existing PO(s) — those will be skipped.\n`);
  } else {
    console.log("   None found.\n");
  }

  console.log('Looking up customer "wayne"...');
  const wayne = await lookupCustomer("wayne");
  if (!wayne) {
    console.error('❌ No customer with first name "wayne" found. Create the account first (or run npm run seed:v2).');
    process.exit(1);
  }
  console.log(`   Found: ${wayne.displayName} <${wayne.email}> (id: ${wayne.numericId})`);

  console.log('Looking up customer "alice"...');
  const alice = await lookupCustomer("alice");
  if (!alice) {
    console.error('❌ No customer with first name "alice" found. Create the account first (or run npm run seed:v2).');
    process.exit(1);
  }
  console.log(`   Found: ${alice.displayName} <${alice.email}> (id: ${alice.numericId})\n`);

  console.log("Fetching product variants...");
  const variants = await fetchVariants();
  if (variants.length < 10) {
    console.error(`❌ Only ${variants.length} variant(s) found (need at least 10). Run npm run seed:v2 first.`);
    process.exit(1);
  }
  console.log(`   Found ${variants.length} variants.\n`);

  const remaining = ORDER_TEMPLATES.filter(t => !existingPOs.has(`PO-ACME-${t.poSuffix}`)).length;
  console.log(`Creating orders... (${remaining} to create, ~${Math.ceil(remaining * ORDER_DELAY_MS / 60000)} min)`);
  await createOrders(wayne, alice, variants, existingPOs);
}

main().catch(err => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
