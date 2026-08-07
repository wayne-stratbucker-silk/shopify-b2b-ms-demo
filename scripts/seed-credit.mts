// Seed demo credit/AR data into Company metafields (namespace b2b) so the
// metafield ERP adapter (lib/erp/metafield-adapter.ts) has real Shopify data to
// read. Shopify has no OOTB credit-limit / AR-balance object, so these live in
// metafields; staff can edit them in the admin afterwards.
//
//   node --env-file=.env.local --import tsx/esm scripts/seed-credit.mts
//
// Values mirror the former mock's 5-profile range (bucketed by companyId % 5)
// so the demo still shows healthy / near-limit / on-hold states.

import { getAdminToken } from "../lib/shopify/admin-token";

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const API_VERSION = "2026-07";
const ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

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

interface Profile {
  creditEnabled: boolean; creditLimit: number; arBalance: number;
  paymentTerms: string; creditHold: boolean; limitPurchases: boolean;
}
const PROFILES: Profile[] = [
  { creditEnabled: true, creditLimit: 50_000,  arBalance: 12_450.18,  paymentTerms: "Net 30", creditHold: false, limitPurchases: false },
  { creditEnabled: true, creditLimit: 100_000, arBalance: 38_900.00,  paymentTerms: "Net 30", creditHold: false, limitPurchases: true },
  { creditEnabled: true, creditLimit: 250_000, arBalance: 198_223.45, paymentTerms: "Net 45", creditHold: false, limitPurchases: true },
  { creditEnabled: true, creditLimit: 25_000,  arBalance: 1_245.00,   paymentTerms: "Net 15", creditHold: true,  limitPurchases: true },
  { creditEnabled: true, creditLimit: 500_000, arBalance: 87_400.00,  paymentTerms: "Net 60", creditHold: false, limitPurchases: false },
];

// 1. Fetch all companies.
const companies: Array<{ id: string; name: string }> = [];
let cursor: string | null = null;
do {
  const data: { companies: { pageInfo: { hasNextPage: boolean; endCursor: string }; edges: Array<{ node: { id: string; name: string } }> } } =
    await admin(
      `query($cursor: String) {
        companies(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          edges { node { id name } }
        }
      }`,
      { cursor },
    );
  for (const e of data.companies.edges) companies.push(e.node);
  cursor = data.companies.pageInfo.hasNextPage ? data.companies.pageInfo.endCursor : null;
} while (cursor);

console.log(`Found ${companies.length} companies. Seeding b2b credit metafields…`);

let done = 0;
let errors = 0;
for (const company of companies) {
  const numericId = parseInt(company.id.split("/").pop() ?? "0", 10);
  const p = PROFILES[numericId % PROFILES.length];
  const metafields = [
    { key: "credit_enabled",  type: "boolean",        value: String(p.creditEnabled) },
    { key: "credit_limit",    type: "number_decimal", value: p.creditLimit.toFixed(2) },
    { key: "ar_balance",      type: "number_decimal", value: p.arBalance.toFixed(2) },
    { key: "payment_terms",   type: "single_line_text_field", value: p.paymentTerms },
    { key: "limit_purchases", type: "boolean",        value: String(p.limitPurchases) },
    { key: "credit_hold",     type: "boolean",        value: String(p.creditHold) },
  ].map((m) => ({ ...m, ownerId: company.id, namespace: "b2b" }));

  const data = await admin<{ metafieldsSet: { userErrors: Array<{ field: string[]; message: string }> } }>(
    `mutation($mf: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $mf) { userErrors { field message } }
    }`,
    { mf: metafields },
  );
  const ue = data.metafieldsSet.userErrors;
  if (ue?.length) { errors += ue.length; console.log(`  ⚠ ${company.name}: ${JSON.stringify(ue.slice(0, 3))}`); }
  done++;
  console.log(`  ${done}/${companies.length}  ${company.name} → limit $${p.creditLimit.toLocaleString()}, AR $${p.arBalance.toLocaleString()}, ${p.paymentTerms}${p.creditHold ? ", ON HOLD" : ""}`);
}

console.log(`\n✅ Done. Seeded credit metafields for ${done} companies. userErrors: ${errors}`);
