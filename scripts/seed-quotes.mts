/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Seed a couple of B2B quotes (draft orders) per company using existing store
 * data. Safe to run after shopify-seed-v2 (the v2 quote step was historically
 * flaky). Uses purchasingEntity only (2026-07 rejects customer + purchasing_entity).
 *
 * Run: npm run seed:quotes
 */
import "dotenv/config";
import { getAdminToken } from "../lib/shopify/admin-token";

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const API_VERSION = "2026-07";
const ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;
const ADMIN_TOKEN = await getAdminToken();

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": ADMIN_TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  const j = (await r.json()) as any;
  if (j.errors) throw new Error(JSON.stringify(j.errors));
  return j.data as T;
}
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const pd = await gql<any>(`{ products(first: 10) { edges { node { title variants(first: 1) { edges { node { id price } } } } } } }`);
const variants = pd.products.edges
  .map((e: any) => e.node.variants.edges[0]?.node && { id: e.node.variants.edges[0].node.id, price: e.node.variants.edges[0].node.price })
  .filter(Boolean);

const cd = await gql<any>(`{ companies(first: 20) { edges { node { id name locations(first: 1) { edges { node { id } } } contacts(first: 1) { edges { node { id } } } } } } }`);
const companies = cd.companies.edges.map((e: any) => e.node);

const now = Date.now();
const TEMPLATES = [
  { status: "new", title: "Q3 Restock — Panels & Breakers" },
  { status: "in_process", title: "Project Bid — Lighting Retrofit" },
];

let made = 0;
for (const co of companies) {
  const loc = co.locations.edges[0]?.node.id;
  const contact = co.contacts.edges[0]?.node.id;
  if (!loc || !contact) { console.warn(`  ⚠ ${co.name}: no location/contact`); continue; }
  for (let k = 0; k < TEMPLATES.length; k++) {
    const t = TEMPLATES[k];
    const picks = variants.slice(k * 2, k * 2 + 3);
    const lineItems = picks.map((v: any, i: number) => ({ variantId: v.id, quantity: (i + 1) * 5, originalUnitPrice: v.price }));
    const metafields = [
      { namespace: "quote", key: "status", value: t.status, type: "single_line_text_field" },
      { namespace: "quote", key: "title", value: t.title, type: "single_line_text_field" },
      { namespace: "quote", key: "reference_number", value: `Q-${1000 + made}`, type: "single_line_text_field" },
      { namespace: "quote", key: "expires_at", value: new Date(now + 14 * 86400000).toISOString(), type: "single_line_text_field" },
      { namespace: "quote", key: "notes_thread", value: JSON.stringify([{ author: "Sales Team", authorRole: "rep", date: new Date(now).toISOString(), body: "Thanks for your interest — here is your quote." }]), type: "json" },
    ];
    const res = await gql<any>(
      `mutation ($input: DraftOrderInput!) { draftOrderCreate(input: $input) { draftOrder { id } userErrors { message } } }`,
      { input: { lineItems, purchasingEntity: { purchasingCompany: { companyId: co.id, companyLocationId: loc, companyContactId: contact } }, tags: ["b2b-quote"], metafields } },
    );
    const errs = res.draftOrderCreate.userErrors;
    if (errs.length) console.warn(`  ⚠ ${co.name} ${t.status}: ${errs.map((e: any) => e.message).join(", ")}`);
    else { made++; console.log(`  ✓ ${co.name}: ${t.title}`); }
    await sleep(300);
  }
}
console.log(`✅ Created ${made} quotes`);
