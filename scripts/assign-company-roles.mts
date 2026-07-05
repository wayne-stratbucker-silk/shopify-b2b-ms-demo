/**
 * Ensure every company contact has a role assigned at its company location(s).
 * B2B draft orders / quotes / checkout require the contact to hold a role at the
 * purchasing location ("No role assigned for company location id ..." otherwise).
 * Idempotent: skips contacts that already have a role assignment.
 *
 * Run: npm run assign:roles
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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Company {
  id: string;
  name: string;
  contactRoles: { edges: Array<{ node: { id: string; name: string } }> };
  locations: { edges: Array<{ node: { id: string } }> };
  contacts: { edges: Array<{ node: { id: string; roleAssignments: { edges: Array<{ node: { id: string } }> } } }> };
}

let cursor: string | null = null;
let assigned = 0;
do {
  const data = await graphql<{ companies: { edges: Array<{ cursor: string; node: Company }>; pageInfo: { hasNextPage: boolean } } }>(
    `query ($after: String) {
      companies(first: 20, after: $after) {
        edges { cursor node {
          id name
          contactRoles(first: 10) { edges { node { id name } } }
          locations(first: 10) { edges { node { id } } }
          contacts(first: 25) { edges { node { id roleAssignments(first: 5) { edges { node { id } } } } } }
        } }
        pageInfo { hasNextPage }
      }
    }`,
    { after: cursor },
  );

  for (const { node: co } of data.companies.edges) {
    const roles = co.contactRoles.edges.map((e) => e.node);
    const adminRole = roles.find((r) => /admin/i.test(r.name))?.id ?? roles[0]?.id;
    const orderRole = roles.find((r) => /order|buyer/i.test(r.name))?.id ?? adminRole;
    const locationIds = co.locations.edges.map((e) => e.node.id);
    if (!adminRole || !locationIds.length) {
      console.warn(`  ⚠ ${co.name}: no roles or locations — skipping`);
      continue;
    }
    const contacts = co.contacts.edges.map((e) => e.node);
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      if (c.roleAssignments.edges.length) continue; // already has a role
      const roleId = i === 0 ? adminRole : orderRole; // main contact = admin, rest = ordering
      const rolesToAssign = locationIds.map((companyLocationId) => ({ companyContactRoleId: roleId, companyLocationId }));
      const res = await graphql<{ companyContactAssignRoles: { userErrors: Array<{ message: string }> } }>(
        `mutation ($id: ID!, $roles: [CompanyContactRoleAssign!]!) {
          companyContactAssignRoles(companyContactId: $id, rolesToAssign: $roles) { userErrors { message } }
        }`,
        { id: c.id, roles: rolesToAssign },
      );
      const errs = res.companyContactAssignRoles.userErrors;
      if (errs.length) console.warn(`  ⚠ ${co.name} contact#${i}: ${errs.map((e) => e.message).join(", ")}`);
      else assigned++;
      await sleep(120);
    }
    console.log(`  ✓ ${co.name}`);
  }

  const edges = data.companies.edges;
  cursor = data.companies.pageInfo.hasNextPage ? edges[edges.length - 1].cursor : null;
} while (cursor);

console.log(`✅ Assigned roles to ${assigned} contacts`);
