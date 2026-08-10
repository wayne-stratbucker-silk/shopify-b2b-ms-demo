// Phase 1 — sales_rep Shopify data model.
//
// Ensures the PRIVATE `sales_rep` metaobject definition exists, creates two
// COMPANY metafield definitions (namespace "sales_rep": `rep` and `backup_reps`)
// bound to it, and backfills a `sales_rep` metaobject per distinct rep email from
// each Company's existing sales_rep.{name,title,email,phone} text metafields —
// then points Company.sales_rep.rep at the matching metaobject.
//
// CRITICAL: the metaobject and both metafield definitions are PRIVATE — no
// storefront access is granted. Rep PII must never leak to the storefront.
//
// Idempotent. Pass --dry-run to log the plan and mutate nothing.
//
//   npm run seed:sales-reps -- --dry-run
//   npm run seed:sales-reps

import { getAdminToken } from "../lib/shopify/admin-token";

const DRY_RUN = process.argv.includes("--dry-run");

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const API_VERSION = "2026-07";
const ENDPOINT = `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`;
const ADMIN_TOKEN = await getAdminToken();

if (!STORE_DOMAIN) {
  console.error("SHOPIFY_STORE_DOMAIN is not set");
  process.exit(1);
}

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

const MO_TYPE = "sales_rep";

// Metaobject field definitions. `photo` is an optional file_reference; everything
// else is required=false so partial reps (from thin backfill data) still validate.
const MO_FIELDS = [
  { name: "Name", key: "name", type: "single_line_text_field" },
  { name: "Email", key: "email", type: "single_line_text_field" },
  { name: "Title", key: "title", type: "single_line_text_field" },
  { name: "Phone", key: "phone", type: "single_line_text_field" },
  { name: "Active", key: "active", type: "boolean" },
  { name: "Access level", key: "access_level", type: "single_line_text_field" },
  { name: "Can impersonate", key: "can_impersonate", type: "boolean" },
  { name: "Can place orders", key: "can_place_orders", type: "boolean" },
  { name: "Team", key: "team", type: "single_line_text_field" },
  { name: "Photo", key: "photo", type: "file_reference" },
];

// ---------------------------------------------------------------------------
// 1a. PRIVATE metaobject definition.
//
// Follows create-shopping-list-metaobject.mts: no `access`/`capabilities` block
// is sent, so the definition stays admin-only (no storefront/publishable access).
// Idempotent — creates if missing, else adds any newly-declared fields.
// ---------------------------------------------------------------------------
async function ensureMetaobjectDefinition(): Promise<string> {
  const existing = await graphql<{
    metaobjectDefinitionByType: { id: string; fieldDefinitions: Array<{ key: string }> } | null;
  }>(`query { metaobjectDefinitionByType(type: "${MO_TYPE}") { id fieldDefinitions { key } } }`);

  if (!existing.metaobjectDefinitionByType) {
    if (DRY_RUN) {
      console.log(`  [dry-run] would create PRIVATE metaobject definition "${MO_TYPE}" with ${MO_FIELDS.length} fields`);
      return "gid://shopify/MetaobjectDefinition/DRY_RUN";
    }
    const res = await graphql<{
      metaobjectDefinitionCreate: { metaobjectDefinition: { id: string } | null; userErrors: Array<{ message: string }> };
    }>(
      `mutation CreateDef($definition: MetaobjectDefinitionCreateInput!) {
        metaobjectDefinitionCreate(definition: $definition) {
          metaobjectDefinition { id }
          userErrors { field message code }
        }
      }`,
      { definition: { name: "Sales Rep", type: MO_TYPE, fieldDefinitions: MO_FIELDS } },
    );
    const errs = res.metaobjectDefinitionCreate.userErrors;
    if (errs.length) throw new Error(`metaobject definition: ${errs.map((e) => e.message).join(", ")}`);
    const id = res.metaobjectDefinitionCreate.metaobjectDefinition!.id;
    console.log(`  ✓ created PRIVATE ${MO_TYPE} definition with ${MO_FIELDS.length} fields (${id})`);
    return id;
  }

  const defId = existing.metaobjectDefinitionByType.id;
  const have = new Set(existing.metaobjectDefinitionByType.fieldDefinitions.map((f) => f.key));
  const missing = MO_FIELDS.filter((f) => !have.has(f.key));
  if (!missing.length) {
    console.log(`  = ${MO_TYPE} definition already complete (${defId})`);
    return defId;
  }
  if (DRY_RUN) {
    console.log(`  [dry-run] would add missing ${MO_TYPE} fields: ${missing.map((f) => f.key).join(", ")}`);
    return defId;
  }
  const res = await graphql<{ metaobjectDefinitionUpdate: { userErrors: Array<{ message: string }> } }>(
    `mutation UpdateDef($id: ID!, $definition: MetaobjectDefinitionUpdateInput!) {
      metaobjectDefinitionUpdate(id: $id, definition: $definition) { userErrors { field message code } }
    }`,
    { id: defId, definition: { fieldDefinitions: missing.map((f) => ({ create: f })) } },
  );
  const errs = res.metaobjectDefinitionUpdate.userErrors;
  if (errs.length) throw new Error(`metaobject definition update: ${errs.map((e) => e.message).join(", ")}`);
  console.log(`  ✓ added missing ${MO_TYPE} fields: ${missing.map((f) => f.key).join(", ")}`);
  return defId;
}

// ---------------------------------------------------------------------------
// 1b. PRIVATE COMPANY metafield definitions bound to the metaobject definition.
//
// access.storefront is omitted → PRIVATE (NOT PUBLIC_READ). "TAKEN" = exists.
// ---------------------------------------------------------------------------
async function ensureCompanyMetafieldDefinition(
  key: string,
  name: string,
  type: string,
  metaobjectDefinitionId: string,
): Promise<void> {
  // Bind the reference to the sales_rep metaobject definition so only sales_rep
  // metaobjects are assignable. Skipped under dry-run when we have no real def id.
  const validations =
    metaobjectDefinitionId && !metaobjectDefinitionId.endsWith("DRY_RUN")
      ? [{ name: "metaobject_definition_id", value: metaobjectDefinitionId }]
      : [];

  if (DRY_RUN) {
    console.log(`  [dry-run] would create PRIVATE COMPANY metafield sales_rep.${key} (${type})`);
    return;
  }

  const data = await graphql<{
    metafieldDefinitionCreate: { createdDefinition: { id: string } | null; userErrors: Array<{ code: string; message: string }> };
  }>(
    `mutation CreateDef($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id }
        userErrors { code message }
      }
    }`,
    {
      definition: {
        name,
        namespace: "sales_rep",
        key,
        type,
        ownerType: "COMPANY",
        validations,
        // No access.storefront → PRIVATE. Rep references must not reach the storefront.
      },
    },
  );
  const errs = data.metafieldDefinitionCreate.userErrors;
  if (data.metafieldDefinitionCreate.createdDefinition) {
    console.log(`  ✓ sales_rep.${key} (${type})`);
  } else if (errs.some((e) => e.code === "TAKEN")) {
    console.log(`  = sales_rep.${key} (exists)`);
  } else {
    console.warn(`  ⚠ sales_rep.${key}: ${errs.map((e) => e.message).join(", ")}`);
  }
}

// ---------------------------------------------------------------------------
// 1c. Backfill.
// ---------------------------------------------------------------------------
interface CompanyRep {
  companyId: string;
  companyName: string;
  repId: string | null; // existing sales_rep.rep reference, if any
  name: string;
  title: string;
  email: string;
  phone: string;
}

async function fetchCompanies(): Promise<CompanyRep[]> {
  const out: CompanyRep[] = [];
  let cursor: string | null = null;
  do {
    const data: {
      companies: {
        pageInfo: { hasNextPage: boolean; endCursor: string };
        edges: Array<{
          node: {
            id: string;
            name: string;
            rep: { value: string } | null;
            metafields: { edges: Array<{ node: { key: string; value: string } }> };
          };
        }>;
      };
    } = await graphql(
      `query($cursor: String) {
        companies(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              name
              rep: metafield(namespace: "sales_rep", key: "rep") { value }
              metafields(first: 10, namespace: "sales_rep") {
                edges { node { key value } }
              }
            }
          }
        }
      }`,
      { cursor },
    );
    for (const e of data.companies.edges) {
      const mf = new Map(e.node.metafields.edges.map((x) => [x.node.key, x.node.value]));
      out.push({
        companyId: e.node.id,
        companyName: e.node.name,
        repId: e.node.rep?.value ?? null,
        name: (mf.get("name") ?? "").trim(),
        title: (mf.get("title") ?? "").trim(),
        email: (mf.get("email") ?? "").trim(),
        phone: (mf.get("phone") ?? "").trim(),
      });
    }
    cursor = data.companies.pageInfo.hasNextPage ? data.companies.pageInfo.endCursor : null;
  } while (cursor);
  return out;
}

// Map existing sales_rep metaobjects by (lowercased) email → GID.
async function fetchExistingRepsByEmail(): Promise<Map<string, string>> {
  const byEmail = new Map<string, string>();
  let cursor: string | null = null;
  do {
    const data: {
      metaobjects: {
        pageInfo: { hasNextPage: boolean; endCursor: string };
        edges: Array<{ node: { id: string; email: { value: string } | null } }>;
      };
    } = await graphql(
      `query($cursor: String) {
        metaobjects(type: "${MO_TYPE}", first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          edges { node { id email: field(key: "email") { value } } }
        }
      }`,
      { cursor },
    );
    for (const e of data.metaobjects.edges) {
      const email = (e.node.email?.value ?? "").trim().toLowerCase();
      if (email && !byEmail.has(email)) byEmail.set(email, e.node.id);
    }
    cursor = data.metaobjects.pageInfo.hasNextPage ? data.metaobjects.pageInfo.endCursor : null;
  } while (cursor);
  return byEmail;
}

async function createRepMetaobject(rep: CompanyRep): Promise<string> {
  const fields = [
    { key: "name", value: rep.name },
    { key: "email", value: rep.email },
    { key: "title", value: rep.title },
    { key: "phone", value: rep.phone },
    { key: "active", value: "true" },
    { key: "access_level", value: "rep" },
    { key: "can_impersonate", value: "true" },
    { key: "can_place_orders", value: "false" },
  ].filter((f) => f.value !== ""); // omit empty optional text fields

  const data = await graphql<{
    metaobjectCreate: { metaobject: { id: string } | null; userErrors: Array<{ message: string }> };
  }>(
    `mutation CreateMO($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) { metaobject { id } userErrors { field message code } }
    }`,
    { metaobject: { type: MO_TYPE, fields } },
  );
  const errs = data.metaobjectCreate.userErrors;
  if (errs.length) throw new Error(`metaobject create: ${errs.map((e) => e.message).join(", ")}`);
  return data.metaobjectCreate.metaobject!.id;
}

async function setCompanyRepReference(companyId: string, repGid: string): Promise<void> {
  const data = await graphql<{ metafieldsSet: { userErrors: Array<{ message: string }> } }>(
    `mutation($mf: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $mf) { userErrors { field message } }
    }`,
    {
      mf: [{ ownerId: companyId, namespace: "sales_rep", key: "rep", type: "metaobject_reference", value: repGid }],
    },
  );
  const ue = data.metafieldsSet.userErrors;
  if (ue?.length) throw new Error(`metafieldsSet: ${ue.map((e) => e.message).join(", ")}`);
}

async function backfill(): Promise<void> {
  const companies = await fetchCompanies();
  console.log(`\nBackfill: read ${companies.length} companies.`);

  const withEmail = companies.filter((c) => c.email);
  const distinctEmails = new Set(withEmail.map((c) => c.email.toLowerCase()));
  console.log(
    `  ${withEmail.length} companies have a sales_rep.email; ${distinctEmails.size} distinct rep email(s).`,
  );

  // Existing metaobjects (empty under dry-run since none may exist yet).
  const existingReps = DRY_RUN ? new Map<string, string>() : await fetchExistingRepsByEmail();
  console.log(`  ${existingReps.size} sales_rep metaobject(s) already exist.`);

  // Pass 1: ensure one metaobject per distinct email.
  let repsCreated = 0;
  // Track first-seen rep row per email for the create payload.
  const firstByEmail = new Map<string, CompanyRep>();
  for (const c of withEmail) {
    const key = c.email.toLowerCase();
    if (!firstByEmail.has(key)) firstByEmail.set(key, c);
  }
  for (const [email, rep] of firstByEmail) {
    if (existingReps.has(email)) continue;
    if (DRY_RUN) {
      console.log(`  [dry-run] would create sales_rep metaobject for ${rep.name || "(no name)"} <${rep.email}>`);
      // Record a placeholder so the reference plan below is coherent.
      existingReps.set(email, `gid://shopify/Metaobject/DRY_RUN_${email}`);
      repsCreated++;
      continue;
    }
    const gid = await createRepMetaobject(rep);
    existingReps.set(email, gid);
    repsCreated++;
    console.log(`  ✓ created sales_rep metaobject for ${rep.name || "(no name)"} <${rep.email}> (${gid})`);
  }

  // Pass 2: point each company's sales_rep.rep at the matching metaobject.
  let refsSet = 0;
  let refsSkipped = 0;
  for (const c of withEmail) {
    const gid = existingReps.get(c.email.toLowerCase());
    if (!gid) continue;
    if (c.repId === gid) {
      refsSkipped++;
      continue;
    }
    if (DRY_RUN) {
      const verb = c.repId ? "re-point" : "set";
      console.log(`  [dry-run] would ${verb} ${c.companyName} sales_rep.rep → ${gid}`);
      refsSet++;
      continue;
    }
    await setCompanyRepReference(c.companyId, gid);
    refsSet++;
    console.log(`  ✓ ${c.companyName} sales_rep.rep → ${gid}`);
  }

  const noEmail = companies.length - withEmail.length;
  console.log(
    `\nBackfill plan: ${repsCreated} rep metaobject(s) ${DRY_RUN ? "to create" : "created"}, ` +
      `${refsSet} company reference(s) ${DRY_RUN ? "to set" : "set"}, ` +
      `${refsSkipped} already correct, ${noEmail} company(ies) without a rep email.`,
  );
}

// ---------------------------------------------------------------------------
async function run() {
  console.log(`sales_rep data model → ${STORE_DOMAIN}${DRY_RUN ? "  [DRY RUN — no writes]" : ""}\n`);

  console.log("1a. Metaobject definition (PRIVATE):");
  const moDefId = await ensureMetaobjectDefinition();

  console.log("\n1b. COMPANY metafield definitions (PRIVATE, namespace sales_rep):");
  await ensureCompanyMetafieldDefinition("rep", "Sales Rep", "metaobject_reference", moDefId);
  await ensureCompanyMetafieldDefinition("backup_reps", "Backup Reps", "list.metaobject_reference", moDefId);

  console.log("\n1c. Backfill reps from Company sales_rep.{name,title,email,phone}:");
  await backfill();

  console.log(`\n✅ Done${DRY_RUN ? " (dry run — nothing was written)" : ""}.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
