/**
 * Create PRODUCT metafield definitions (namespace "custom") with storefront
 * PUBLIC_READ access. Without a definition granting storefront access, metafield
 * values set via the Admin API are NOT readable through the Storefront API, so the
 * PDP loses uom / pricing tiers / specs / lead time / etc. Idempotent (skips TAKEN).
 *
 * Run: npm run seed:metafield-defs
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
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

// key -> { name, type } — types match the values stored by shopify-seed-v2.
const DEFS = [
  { key: "uom", name: "Unit of Measure", type: "single_line_text_field" },
  { key: "pricing_tiers", name: "Pricing Tiers", type: "json" },
  { key: "lead_time", name: "Lead Time", type: "single_line_text_field" },
  { key: "spec_sheet_url", name: "Spec Sheet URL", type: "single_line_text_field" },
  { key: "install_guide_url", name: "Install Guide URL", type: "single_line_text_field" },
  { key: "cad_file_url", name: "CAD File URL", type: "single_line_text_field" },
  { key: "product_specs", name: "Product Specs", type: "json" },
  { key: "warranty", name: "Warranty", type: "single_line_text_field" },
  { key: "msrp", name: "MSRP", type: "number_decimal" },
];

let created = 0;
let existed = 0;
for (const def of DEFS) {
  const data = await graphql<{ metafieldDefinitionCreate: { createdDefinition: { id: string } | null; userErrors: Array<{ code: string; message: string }> } }>(
    `mutation CreateDef($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id }
        userErrors { code message }
      }
    }`,
    {
      definition: {
        name: def.name,
        namespace: "custom",
        key: def.key,
        type: def.type,
        ownerType: "PRODUCT",
        access: { storefront: "PUBLIC_READ" },
      },
    },
  );
  const errs = data.metafieldDefinitionCreate.userErrors;
  if (data.metafieldDefinitionCreate.createdDefinition) {
    created++;
    console.log(`  ✓ custom.${def.key}`);
  } else if (errs.some((e) => e.code === "TAKEN")) {
    existed++;
    console.log(`  = custom.${def.key} (exists)`);
  } else {
    console.warn(`  ⚠ custom.${def.key}: ${errs.map((e) => e.message).join(", ")}`);
  }
}
console.log(`✅ Metafield definitions: ${created} created, ${existed} already existed`);
