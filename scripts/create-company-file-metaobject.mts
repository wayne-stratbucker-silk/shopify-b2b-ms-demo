/**
 * Create the `company_file` metaobject definition and seed a few sample
 * documents for the first B2B company. Idempotent for the definition; each run
 * appends fresh sample files.
 *
 * Run: npm run seed:company-files
 */

import { config } from "dotenv";
import { getAdminToken } from "../lib/shopify/admin-token";
config({ path: ".env.local" });

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? "headless-b2b-demo.myshopify.com";
const ADMIN_TOKEN = await getAdminToken();
const API_VERSION = "2026-07";
const ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;

if (!ADMIN_TOKEN) {
  console.error("SHOPIFY_ADMIN_API_TOKEN is not set");
  process.exit(1);
}

// Public sample PDF Shopify can fetch for fileCreate(originalSource).
const SAMPLE_PDF = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": ADMIN_TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(`GraphQL: ${json.errors.map((e) => e.message).join(", ")}`);
  return json.data;
}

async function ensureDefinition(): Promise<void> {
  const existing = await graphql<{ metaobjectDefinitionByType: { id: string } | null }>(
    `query { metaobjectDefinitionByType(type: "company_file") { id } }`,
  );
  if (existing.metaobjectDefinitionByType) {
    console.log("✓ company_file definition already exists");
    return;
  }
  const res = await graphql<{ metaobjectDefinitionCreate: { userErrors: Array<{ message: string }> } }>(
    `mutation CreateDef($definition: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $definition) {
        metaobjectDefinition { id }
        userErrors { field message code }
      }
    }`,
    {
      definition: {
        name: "Company File",
        type: "company_file",
        fieldDefinitions: [
          { name: "Company", key: "company", type: "single_line_text_field" },
          { name: "File", key: "file", type: "file_reference" },
          { name: "Record type", key: "record_type", type: "single_line_text_field" },
          { name: "Record id", key: "record_id", type: "single_line_text_field" },
          { name: "Category", key: "category", type: "single_line_text_field" },
          { name: "Title", key: "title", type: "single_line_text_field" },
        ],
      },
    },
  );
  const errs = res.metaobjectDefinitionCreate.userErrors;
  if (errs.length) throw new Error(`definition: ${errs.map((e) => e.message).join(", ")}`);
  console.log("✓ created company_file definition");
}

async function firstCompany(): Promise<{ id: string; name: string } | null> {
  const data = await graphql<{ companies: { edges: Array<{ node: { id: string; name: string } }> } }>(
    `query { companies(first: 1) { edges { node { id name } } } }`,
  );
  return data.companies.edges[0]?.node ?? null;
}

async function firstOrderId(companyId: string): Promise<string | null> {
  const numeric = companyId.replace("gid://shopify/Company/", "");
  const data = await graphql<{ orders: { edges: Array<{ node: { id: string } }> } }>(
    `query FirstOrder($q: String!) { orders(first: 1, query: $q, sortKey: CREATED_AT, reverse: true) { edges { node { id } } } }`,
    { q: `company_id:${numeric}` },
  );
  const gid = data.orders.edges[0]?.node?.id;
  return gid ? gid.split("/").pop() ?? null : null;
}

async function createFile(sourceUrl: string, title: string): Promise<string | null> {
  const data = await graphql<{ fileCreate: { files: Array<{ id: string }>; userErrors: Array<{ message: string }> } }>(
    `mutation CreateFile($files: [FileCreateInput!]!) {
      fileCreate(files: $files) { files { id } userErrors { field message } }
    }`,
    { files: [{ originalSource: sourceUrl, contentType: "FILE", alt: title }] },
  );
  if (data.fileCreate.userErrors.length) {
    console.warn(`  ! fileCreate: ${data.fileCreate.userErrors.map((e) => e.message).join(", ")}`);
    return null;
  }
  return data.fileCreate.files[0]?.id ?? null;
}

async function createMetaobject(fields: Record<string, string>): Promise<void> {
  const data = await graphql<{ metaobjectCreate: { metaobject: { id: string } | null; userErrors: Array<{ message: string }> } }>(
    `mutation CreateMO($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) { metaobject { id } userErrors { field message code } }
    }`,
    { metaobject: { type: "company_file", fields: Object.entries(fields).map(([key, value]) => ({ key, value })) } },
  );
  const errs = data.metaobjectCreate.userErrors;
  if (errs.length) throw new Error(`metaobject: ${errs.map((e) => e.message).join(", ")}`);
}

async function seedFile(companyId: string, title: string, category: string, recordType: string, recordId: string) {
  const fileId = await createFile(SAMPLE_PDF, title);
  if (!fileId) return;
  await createMetaobject({ company: companyId, file: fileId, record_type: recordType, record_id: recordId, category, title });
  console.log(`  ✓ ${title} [${category || recordType}]`);
}

async function run() {
  await ensureDefinition();

  const company = await firstCompany();
  if (!company) {
    console.error("No company found — seed a company first.");
    process.exit(1);
  }
  console.log(`\nSeeding files for: ${company.name} (${company.id})\n`);

  await seedFile(company.id, "Master Services Agreement.pdf", "Contracts", "general", "");
  await seedFile(company.id, "2025 Contract Price Sheet.pdf", "Pricing", "general", "");
  await seedFile(company.id, "W-9 Tax Form.pdf", "Compliance", "general", "");
  await seedFile(company.id, "Certificate of Insurance.pdf", "Compliance", "general", "");

  const orderId = await firstOrderId(company.id);
  if (orderId) {
    await seedFile(company.id, `Signed PO — Order ${orderId}.pdf`, "", "invoice", orderId);
    await seedFile(company.id, `Proof of Delivery — Order ${orderId}.pdf`, "", "order", orderId);
  } else {
    console.log("  (no orders found — skipping record attachments)");
  }

  console.log("\nDone.");
}

run().catch((e) => { console.error(e); process.exit(1); });
