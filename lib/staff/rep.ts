// Sales-rep authorization — resolves a staff Google identity to a `sales_rep`
// metaobject and decides which companies that rep may act on / impersonate.
//
// Data model (Phase 1, PRIVATE):
//   - metaobject definition `sales_rep`: name/email/title/phone (text),
//     active/can_impersonate/can_place_orders (boolean → "true"/"false" strings),
//     access_level ∈ {rep,manager,admin}, team (text), photo (file_reference).
//   - Company metafields (namespace "sales_rep"):
//       key `rep`          → metaobject_reference → sales_rep (assigned rep)
//       key `backup_reps`  → list.metaobject_reference → sales_rep[] (backups)
//
// Reference resolution mirrors lib/b2b/company-files.ts exactly:
//   single ref  → `field(key){ reference { ... on Metaobject { id fields } } }`
//   list ref    → `field(key){ references(first:N){ nodes { ... on Metaobject { id fields } } } }`

import { cache } from "react";
import { adminQuery } from "@/lib/shopify/admin-client";
import type { StaffCompany } from "@/lib/staff/companies";

export const SALES_REP_TYPE = "sales_rep";

export type AccessLevel = "rep" | "manager" | "admin";

export type Rep = {
  id: string;
  name: string;
  email: string;
  title?: string;
  phone?: string;
  active: boolean;
  accessLevel: AccessLevel;
  canImpersonate: boolean;
  canPlaceOrders: boolean;
  team?: string;
};

// ─── Field helpers ───

interface RepMetaobjectNode {
  id: string;
  fields: Array<{ key: string; value: string | null }>;
}

function fieldVal(node: RepMetaobjectNode, key: string): string {
  return node.fields.find((f) => f.key === key)?.value ?? "";
}

/** Shopify boolean metaobject fields come back as the strings "true"/"false". */
function coerceBool(v: string): boolean {
  return v.trim().toLowerCase() === "true";
}

function normAccessLevel(v: string): AccessLevel {
  const a = v.trim().toLowerCase();
  return a === "admin" || a === "manager" ? a : "rep";
}

function mapRep(node: RepMetaobjectNode): Rep {
  return {
    id: node.id,
    name: fieldVal(node, "name"),
    email: fieldVal(node, "email"),
    title: fieldVal(node, "title") || undefined,
    phone: fieldVal(node, "phone") || undefined,
    active: coerceBool(fieldVal(node, "active")),
    accessLevel: normAccessLevel(fieldVal(node, "access_level")),
    canImpersonate: coerceBool(fieldVal(node, "can_impersonate")),
    canPlaceOrders: coerceBool(fieldVal(node, "can_place_orders")),
    team: fieldVal(node, "team") || undefined,
  };
}

const REP_NODE = `
  id
  fields { key value }
`;

// ─── resolveRep ───

/**
 * Resolve a staff email to its `sales_rep` metaobject. Case-insensitive match
 * on the metaobject's `email` field. Paginates through all sales_rep
 * metaobjects (250/page) so the match isn't capped by page size.
 */
export const resolveRep = cache(async (email: string): Promise<Rep | null> => {
  const target = email.trim().toLowerCase();
  if (!target) return null;

  let after: string | null = null;
  // Guard against unbounded loops on a malformed cursor.
  for (let page = 0; page < 100; page++) {
    const data: {
      metaobjects: {
        edges: Array<{ node: RepMetaobjectNode }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } = await adminQuery<{
      metaobjects: {
        edges: Array<{ node: RepMetaobjectNode }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>(
      `query SalesReps($after: String) {
        metaobjects(type: "${SALES_REP_TYPE}", first: 250, after: $after) {
          edges { node { ${REP_NODE} } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { after },
    ).catch(() => ({
      metaobjects: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
    }));

    const hit = data.metaobjects.edges
      .map((e) => e.node)
      .find((n) => fieldVal(n, "email").trim().toLowerCase() === target);
    if (hit) return mapRep(hit);

    if (!data.metaobjects.pageInfo.hasNextPage) break;
    after = data.metaobjects.pageInfo.endCursor;
    if (!after) break;
  }

  return null;
});

// ─── Company rep assignment (metaobject_reference resolution) ───

/** The rep-assignment view of a company: its primary rep + backup rep ids. */
interface CompanyRepAssignment {
  /** Assigned rep metaobject GID, if any. */
  repId: string | null;
  /** Assigned rep's `team` field — used for manager scoping. */
  repTeam: string | null;
  /** Backup rep metaobject GIDs. */
  backupRepIds: string[];
}

// Resolves company `sales_rep.rep` (single ref) + `sales_rep.backup_reps`
// (list ref) exactly like lib/b2b/company-files.ts resolves its file reference.
const COMPANY_REP_FIELDS = `
  rep: metafield(namespace: "sales_rep", key: "rep") {
    reference { ... on Metaobject { id fields { key value } } }
  }
  backupReps: metafield(namespace: "sales_rep", key: "backup_reps") {
    references(first: 50) {
      nodes { ... on Metaobject { id fields { key value } } }
    }
  }
`;

interface CompanyRepMetafields {
  rep?: { reference?: RepMetaobjectNode | null } | null;
  backupReps?: { references?: { nodes: RepMetaobjectNode[] } | null } | null;
}

function mapAssignment(mf: CompanyRepMetafields | null | undefined): CompanyRepAssignment {
  const repNode = mf?.rep?.reference ?? null;
  const backupNodes = mf?.backupReps?.references?.nodes ?? [];
  return {
    repId: repNode?.id ?? null,
    repTeam: repNode ? fieldVal(repNode, "team") || null : null,
    backupRepIds: backupNodes.map((n) => n.id).filter(Boolean),
  };
}

async function getCompanyRepAssignment(companyId: string): Promise<CompanyRepAssignment> {
  const data = await adminQuery<{ company: CompanyRepMetafields | null }>(
    `query CompanyRepAssignment($id: ID!) {
      company(id: $id) {
        ${COMPANY_REP_FIELDS}
      }
    }`,
    { id: companyId },
  ).catch(() => ({ company: null }));
  return mapAssignment(data.company);
}

/**
 * Core authorization predicate, shared by repCanImpersonate and the in-memory
 * filter in listRepCompanies. Rules are evaluated IN ORDER.
 */
function repMayAct(rep: Rep, assignment: CompanyRepAssignment): boolean {
  if (!rep.active) return false;
  if (!rep.canImpersonate) return false;
  if (rep.accessLevel === "admin") return true;
  if (rep.accessLevel === "manager") {
    // Manager sees any company whose assigned rep shares the manager's team.
    return !!rep.team && !!assignment.repTeam && assignment.repTeam === rep.team;
  }
  // access_level === "rep": only companies where they're primary or a backup.
  return assignment.repId === rep.id || assignment.backupRepIds.includes(rep.id);
}

// ─── repCanImpersonate ───

/**
 * May `rep` impersonate the given company? Reads the company's assigned rep /
 * backup reps on demand and applies the ordered rules in repMayAct.
 */
export async function repCanImpersonate(rep: Rep, companyId: string): Promise<boolean> {
  if (!rep.active || !rep.canImpersonate) return false;
  // Admins are authorized regardless of the company's assignment — skip the fetch.
  if (rep.accessLevel === "admin") return true;
  const assignment = await getCompanyRepAssignment(companyId);
  return repMayAct(rep, assignment);
}

// ─── listRepCompanies ───

interface CompanyWithAssignment {
  company: StaffCompany;
  assignment: CompanyRepAssignment;
}

interface CompanyEdgeNode {
  id: string;
  name: string;
  externalId?: string | null;
  locationsCount?: { count: number } | null;
  ordersCount?: { count: number } | null;
  mainContact?: { customer?: { id: string } | null } | null;
  contacts: { edges: Array<{ node: { customer?: { id: string } | null } }> };
  rep?: { reference?: RepMetaobjectNode | null } | null;
  backupReps?: { references?: { nodes: RepMetaobjectNode[] } | null } | null;
}

function mapCompanyEdge(node: CompanyEdgeNode): CompanyWithAssignment {
  return {
    company: {
      id: node.id,
      name: node.name,
      externalId: node.externalId,
      locations: node.locationsCount?.count ?? 0,
      orders: node.ordersCount?.count ?? 0,
      contactCustomerId:
        node.mainContact?.customer?.id ?? node.contacts.edges[0]?.node.customer?.id,
    },
    assignment: mapAssignment({ rep: node.rep, backupReps: node.backupReps }),
  };
}

/**
 * Companies this rep is authorized to see/impersonate, returned in the same
 * StaffCompany shape as lib/staff/companies.ts#listCompanies so the staff
 * console can swap the source transparently.
 *
 * Strategy: page through ALL companies with cursor pagination (NOT capped at
 * 50), pulling each company's assigned-rep reference (+ backup rep ids + the
 * assigned rep's team for manager scoping) in the same query, then filter
 * in-memory with the same ordered rules as repCanImpersonate.
 *
 * SCALING CEILING: the in-memory filter is O(companies) per rep request and
 * fetches every company each call. That is fine up to ~hundreds of companies.
 * Beyond that, the migration path is a reverse-index metaobject (rep GID →
 * company GIDs) maintained on assignment writes, so a rep's companies can be
 * looked up directly instead of scanning the whole company set.
 */
export async function listRepCompanies(rep: Rep): Promise<StaffCompany[]> {
  if (!rep.active || !rep.canImpersonate) return [];

  const all: CompanyWithAssignment[] = [];
  let after: string | null = null;
  // Bound the loop defensively; 100 pages × 100 companies = 10k ceiling.
  for (let page = 0; page < 100; page++) {
    const data: {
      companies: {
        edges: Array<{ node: CompanyEdgeNode }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } = await adminQuery<{
      companies: {
        edges: Array<{ node: CompanyEdgeNode }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    }>(
      `query RepCompanies($after: String) {
        companies(first: 100, after: $after, sortKey: NAME) {
          edges { node {
            id name externalId
            locationsCount { count }
            ordersCount { count }
            mainContact { customer { id } }
            contacts(first: 1) { edges { node { customer { id } } } }
            ${COMPANY_REP_FIELDS}
          } }
          pageInfo { hasNextPage endCursor }
        }
      }`,
      { after },
    ).catch(() => ({
      companies: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
    }));

    for (const edge of data.companies.edges) all.push(mapCompanyEdge(edge.node));

    if (!data.companies.pageInfo.hasNextPage) break;
    after = data.companies.pageInfo.endCursor;
    if (!after) break;
  }

  // Admins short-circuit to every company; others go through the ordered rules.
  const authorized =
    rep.accessLevel === "admin" ? all : all.filter((c) => repMayAct(rep, c.assignment));
  return authorized.map((c) => c.company);
}
