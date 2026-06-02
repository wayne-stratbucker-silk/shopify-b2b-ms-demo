import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const API = `https://${DOMAIN}/admin/api/2025-04/graphql.json`;

async function gql(query, variables = {}) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

// Canonical collections (no numeric suffixes) — IDs in the 311107* range
const COLLECTIONS = {
  "wire-cable":                  { id: "gid://shopify/Collection/311107354707",  title: "Wire & Cable" },
  "breakers-panels":             { id: "gid://shopify/Collection/311107387475",  title: "Breakers & Panels" },
  "conduit-fittings":            { id: "gid://shopify/Collection/311107420243",  title: "Conduit & Fittings" },
  "lighting-fixtures":           { id: "gid://shopify/Collection/311107453011",  title: "Lighting Fixtures" },
  "switches-receptacles":        { id: "gid://shopify/Collection/311107485779",  title: "Switches & Receptacles" },
  "tools-safety":                { id: "gid://shopify/Collection/311107518547",  title: "Tools & Safety" },
  "low-voltage-communications":  { id: "gid://shopify/Collection/311107551315",  title: "Low Voltage & Communications" },
  "motors-motor-controls":       { id: "gid://shopify/Collection/311107584083",  title: "Motors & Motor Controls" },
  "transformers":                { id: "gid://shopify/Collection/311107616851",  title: "Transformers" },
  "enclosures-boxes":            { id: "gid://shopify/Collection/311107649619",  title: "Enclosures & Boxes" },
  "cable-management":            { id: "gid://shopify/Collection/311107682387",  title: "Cable Management" },
  "grounding-bonding":           { id: "gid://shopify/Collection/311107715155",  title: "Grounding & Bonding" },
  "test-measurement":            { id: "gid://shopify/Collection/311107747923",  title: "Test & Measurement" },
  "industrial-controls":         { id: "gid://shopify/Collection/311107780691",  title: "Industrial Controls" },
};

function col(handle) {
  const { id, title } = COLLECTIONS[handle];
  return { type: "COLLECTION", resourceId: id, title };
}

// 2-level hierarchy: 5 L1 groups, each with 2–4 L2 collection items
const MENU_ITEMS = [
  {
    title: "Electrical Distribution",
    type: "HTTP",
    url: "/collections/all",
    items: [
      col("breakers-panels"),
      col("transformers"),
      col("industrial-controls"),
      col("motors-motor-controls"),
    ],
  },
  {
    title: "Wiring & Infrastructure",
    type: "HTTP",
    url: "/collections/all",
    items: [
      col("wire-cable"),
      col("conduit-fittings"),
      col("cable-management"),
      col("grounding-bonding"),
      col("enclosures-boxes"),
    ],
  },
  {
    title: "Devices & Controls",
    type: "HTTP",
    url: "/collections/all",
    items: [
      col("switches-receptacles"),
      col("low-voltage-communications"),
    ],
  },
  {
    title: "Lighting",
    type: "COLLECTION",
    resourceId: COLLECTIONS["lighting-fixtures"].id,
    items: [],
  },
  {
    title: "Tools & Safety",
    type: "HTTP",
    url: "/collections/all",
    items: [
      col("tools-safety"),
      col("test-measurement"),
    ],
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
