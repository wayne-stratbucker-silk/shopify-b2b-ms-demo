import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const API_VERSION = "2026-07";
const API = `https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

// Mint a short-lived Admin API token via the OAuth client credentials grant
// (SHOPIFY_API_KEY + SHOPIFY_API_SECRET). Plain .mjs, so inline rather than
// importing the TS helper.
async function getAdminToken() {
  const res = await fetch(`https://${DOMAIN}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`client_credentials grant failed ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

const TOKEN = await getAdminToken();

async function gql(query, variables = {}) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

// Store-agnostic: resolve collection GIDs by handle straight from the store
// (no hardcoded IDs). Pages through all collections → { handle: {id, title} }.
async function loadCollections() {
  const map = {};
  let cursor = null;
  do {
    const r = await gql(
      `query ($cursor: String) {
        collections(first: 100, after: $cursor) {
          edges { node { id handle title } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { cursor }
    );
    const conn = r.data?.collections;
    if (!conn) {
      console.error("❌ Failed to load collections:", JSON.stringify(r.errors || r, null, 2));
      break;
    }
    for (const { node } of conn.edges) map[node.handle] = { id: node.id, title: node.title };
    cursor = conn.pageInfo.hasNextPage ? conn.pageInfo.endCursor : null;
  } while (cursor);
  return map;
}

const COLLECTIONS = await loadCollections();
console.log(`Loaded ${Object.keys(COLLECTIONS).length} collections from ${DOMAIN}`);

function col(handle) {
  const c = COLLECTIONS[handle];
  if (!c) {
    console.warn(`  ⚠ no collection with handle "${handle}" — skipping menu item`);
    return null;
  }
  return { type: "COLLECTION", resourceId: c.id, title: c.title };
}

// Build a list of COLLECTION items, dropping any handles that didn't resolve.
function items(...handles) {
  return handles.map(col).filter(Boolean);
}

// 2-level hierarchy: L1 groups, each with L2 collection items
const MENU_ITEMS = [
  {
    title: "Electrical Distribution",
    type: "HTTP",
    url: "/collections/all",
    items: items("breakers-panels", "transformers", "industrial-controls", "motors-motor-controls"),
  },
  {
    title: "Wiring & Infrastructure",
    type: "HTTP",
    url: "/collections/all",
    items: items("wire-cable", "conduit-fittings", "cable-management", "grounding-bonding", "enclosures-boxes"),
  },
  {
    title: "Devices & Controls",
    type: "HTTP",
    url: "/collections/all",
    items: items("switches-receptacles", "low-voltage-communications"),
  },
  ...(COLLECTIONS["lighting-fixtures"]
    ? [{
        title: "Lighting",
        type: "COLLECTION",
        resourceId: COLLECTIONS["lighting-fixtures"].id,
        items: [],
      }]
    : []),
  {
    title: "Tools & Safety",
    type: "HTTP",
    url: "/collections/all",
    items: items("tools-safety", "test-measurement"),
  },
];

// Try create directly — skip read check since write scope may differ
console.log("Attempting menuCreate with handle 'main-menu'…");
const result = await gql(
  `mutation menuCreate($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
    menuCreate(title: $title, handle: $handle, items: $items) {
      menu { id handle title items { title url type items { title url } } }
      userErrors { field message }
    }
  }`,
  { title: "Main Menu", handle: "main-menu", items: MENU_ITEMS }
);

if (result.errors) {
  console.error("❌ GraphQL errors:", JSON.stringify(result.errors, null, 2));
  // If create failed due to duplicate handle, try update by querying via REST
} else if (result.data?.menuCreate?.userErrors?.length) {
  const errs = result.data.menuCreate.userErrors;
  console.error("❌ User errors:", JSON.stringify(errs, null, 2));
  // Handle exists — try updating it via a known GID pattern or REST
  const handleExists = errs.some((e) => e.message?.toLowerCase().includes("handle") || e.message?.toLowerCase().includes("taken") || e.message?.toLowerCase().includes("exist"));
  if (handleExists) {
    console.log("Handle taken — attempting update via menuUpdate by looking up GID…");
    // Shopify menu GIDs aren't guessable, so we need the read scope for the ID.
    console.log("⚠️  Cannot update without read scope. The 'main-menu' already exists in the store.");
    console.log("   Either delete it manually in Online Store → Navigation, or grant read_online_store_navigation scope.");
  }
} else {
  console.log("✅ Menu created!");
  console.log(JSON.stringify(result.data.menuCreate.menu, null, 2));
}
