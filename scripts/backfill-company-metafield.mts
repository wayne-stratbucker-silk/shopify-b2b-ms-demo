/**
 * Backfill custom.company_name metafield on customers.
 *
 * Priority order for the value:
 *   1. existing custom.company_name metafield (skipped — already set)
 *   2. B2B companyContacts (Admin API, requires read_companies scope)
 *   3. customer tag matching /^company:/i
 *   4. defaultAddress.company
 *   5. domain-based mapping for known seeded demo companies
 *
 * Run: npx tsx scripts/backfill-company-metafield.mts
 * Dry-run (no writes): DRY_RUN=1 npx tsx scripts/backfill-company-metafield.mts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN ?? "makeswift-b2b-demo.myshopify.com";
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN ?? "";
const API_VERSION = "2025-04";
const ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;
const DRY_RUN = process.env.DRY_RUN === "1";

if (!ADMIN_TOKEN) {
  console.error("SHOPIFY_ADMIN_API_TOKEN is not set");
  process.exit(1);
}

if (DRY_RUN) console.log("DRY RUN — no writes will be made\n");

// Seeded demo companies — keyed by email domain (or full email for personal accounts)
const DOMAIN_MAP: Record<string, string> = {
  "acme-electric.com": "Acme Electric Supply",
  "acmeelectric.com": "Acme Electric Supply",
  "metro-contractors.com": "Metro Contractors",
  "metrocontractors.com": "Metro Contractors",
  "pacific-install.com": "Pacific Installations",
  "pacificinstallations.com": "Pacific Installations",
  "coastalbuildersgroup.com": "Coastal Builders Group",
  "heartlandmep.com": "Heartland MEP",
  "northeastpowersystems.com": "Northeast Power Systems",
};

function companyFromDomain(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? (DOMAIN_MAP[domain] ?? null) : null;
}

async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": ADMIN_TOKEN },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json() as { data: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(`GraphQL: ${json.errors.map(e => e.message).join(", ")}`);
  return json.data;
}

interface CustomerNode {
  id: string;
  email: string;
  tags: string[];
  companyNameMetafield: { value: string } | null;
  defaultAddress: { company: string | null } | null;
  companyContacts: {
    edges: Array<{ node: { company: { name: string } } }>;
  } | null;
}

interface PageInfo { hasNextPage: boolean; endCursor: string | null }

let b2bAvailable: boolean | null = null;

async function fetchPage(after: string | null): Promise<{ customers: CustomerNode[]; pageInfo: PageInfo }> {
  // Try with companyContacts on first page; fall back to without if unsupported
  const withB2B = b2bAvailable !== false;

  const query = `query Customers($after: String) {
    customers(first: 100, after: $after) {
      edges {
        node {
          id
          email
          tags
          companyNameMetafield: metafield(namespace: "custom", key: "company_name") { value }
          defaultAddress { company }
          ${withB2B ? `companyContacts(first: 1) {
            edges { node { company { name } } }
          }` : ""}
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }`;

  try {
    const data = await graphql<{ customers: { edges: Array<{ node: CustomerNode }>; pageInfo: PageInfo } }>(query, { after });
    if (b2bAvailable === null) {
      b2bAvailable = true;
      console.log("  (B2B companyContacts available)\n");
    }
    return { customers: data.customers.edges.map(e => e.node), pageInfo: data.customers.pageInfo };
  } catch (e) {
    const msg = String(e);
    if (withB2B && (msg.includes("undefinedField") || msg.includes("doesn't exist"))) {
      b2bAvailable = false;
      console.log("  (B2B companyContacts not available — using tag/address/domain fallback)\n");
      return fetchPage(after);
    }
    throw e;
  }
}

async function setMetafield(customerId: string, value: string): Promise<void> {
  if (DRY_RUN) return;
  const data = await graphql<{ metafieldsSet: { userErrors: Array<{ field: string[]; message: string }> } }>(
    `mutation SetCompanyName($id: ID!, $value: String!) {
      metafieldsSet(metafields: [{
        ownerId: $id
        namespace: "custom"
        key: "company_name"
        type: "single_line_text_field"
        value: $value
      }]) {
        metafields { id key value }
        userErrors { field message }
      }
    }`,
    { id: customerId, value }
  );
  const errs = data.metafieldsSet?.userErrors;
  if (errs?.length) throw new Error(`metafieldsSet errors: ${JSON.stringify(errs)}`);
}

async function run() {
  let cursor: string | null = null;
  let total = 0, skipped = 0, updated = 0, noData = 0;

  console.log("Scanning customers...\n");

  do {
    const { customers, pageInfo } = await fetchPage(cursor);

    for (const c of customers) {
      total++;

      if (c.companyNameMetafield?.value) {
        skipped++;
        console.log(`  SKIP  ${c.email} — already set: "${c.companyNameMetafield.value}"`);
        continue;
      }

      const b2bCompany = c.companyContacts?.edges?.[0]?.node?.company?.name?.trim() || null;
      const tagCompany = c.tags.find(t => /^company:/i.test(t))?.replace(/^company:/i, "").trim() || null;
      const addrCompany = c.defaultAddress?.company?.trim() || null;
      const domainCompany = companyFromDomain(c.email);

      const [company, source] =
        b2bCompany   ? [b2bCompany,   "B2B contacts"] :
        tagCompany   ? [tagCompany,   "tag"]           :
        addrCompany  ? [addrCompany,  "address"]       :
        domainCompany? [domainCompany,"domain map"]    :
        [null, null];

      if (!company) {
        noData++;
        console.log(`  SKIP  ${c.email} — no company source found`);
        continue;
      }

      console.log(`  SET   ${c.email} — "${company}" (from ${source})`);
      await setMetafield(c.id, company);
      updated++;
    }

    cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;
  } while (cursor);

  console.log(`\nDone. ${total} customers scanned.`);
  console.log(`  Updated : ${updated}${DRY_RUN ? " (dry run — no writes)" : ""}`);
  console.log(`  Skipped : ${skipped} (metafield already set)`);
  console.log(`  No data : ${noData} (no source found)`);
}

run().catch(e => { console.error(e); process.exit(1); });
