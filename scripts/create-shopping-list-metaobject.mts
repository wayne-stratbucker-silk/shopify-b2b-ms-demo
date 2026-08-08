// Ensure the `b2b_shopping_list` metaobject definition exists with all fields,
// including per-user scoping:
//   name         single_line_text_field
//   description  multi_line_text_field
//   customer_id  single_line_text_field   (owner)
//   company_id   single_line_text_field
//   items        json
//   visibility   single_line_text_field   ("private" | "company" | "shared")
//   shared_with  json                     (array of Customer GIDs)
//
// Idempotent: creates the definition if missing, else adds any missing fields.
//   node --env-file=.env.local --import tsx/esm scripts/create-shopping-list-metaobject.mts

import { getAdminToken } from "../lib/shopify/admin-token";

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const ENDPOINT = `https://${STORE_DOMAIN}/admin/api/2026-07/graphql.json`;
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

const FIELDS = [
  { name: "Name", key: "name", type: "single_line_text_field" },
  { name: "Description", key: "description", type: "multi_line_text_field" },
  { name: "Customer id", key: "customer_id", type: "single_line_text_field" },
  { name: "Company id", key: "company_id", type: "single_line_text_field" },
  { name: "Items", key: "items", type: "json" },
  { name: "Visibility", key: "visibility", type: "single_line_text_field" },
  { name: "Shared with", key: "shared_with", type: "json" },
];

const existing = await admin<{ metaobjectDefinitionByType: { id: string; fieldDefinitions: Array<{ key: string }> } | null }>(
  `query { metaobjectDefinitionByType(type: "b2b_shopping_list") { id fieldDefinitions { key } } }`,
);

if (!existing.metaobjectDefinitionByType) {
  const res = await admin<{ metaobjectDefinitionCreate: { metaobjectDefinition: { id: string } | null; userErrors: Array<{ message: string }> } }>(
    `mutation CreateDef($definition: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $definition) {
        metaobjectDefinition { id }
        userErrors { field message code }
      }
    }`,
    { definition: { name: "B2B Shopping List", type: "b2b_shopping_list", fieldDefinitions: FIELDS } },
  );
  const errs = res.metaobjectDefinitionCreate.userErrors;
  if (errs.length) throw new Error(JSON.stringify(errs));
  console.log("✅ created b2b_shopping_list definition with", FIELDS.length, "fields (incl. visibility + shared_with)");
} else {
  const have = new Set(existing.metaobjectDefinitionByType.fieldDefinitions.map((f) => f.key));
  const missing = FIELDS.filter((f) => !have.has(f.key));
  if (!missing.length) { console.log("✅ definition already complete"); }
  else {
    const res = await admin<{ metaobjectDefinitionUpdate: { userErrors: Array<{ message: string }> } }>(
      `mutation UpdateDef($id: ID!, $definition: MetaobjectDefinitionUpdateInput!) {
        metaobjectDefinitionUpdate(id: $id, definition: $definition) { userErrors { field message code } }
      }`,
      { id: existing.metaobjectDefinitionByType.id, definition: { fieldDefinitions: missing.map((f) => ({ create: f })) } },
    );
    const errs = res.metaobjectDefinitionUpdate.userErrors;
    if (errs.length) throw new Error(JSON.stringify(errs));
    console.log("✅ added missing fields:", missing.map((f) => f.key).join(", "));
  }
}
