import { adminQuery } from "@/lib/shopify/admin-client";

export interface StaffCompany {
  id: string;
  name: string;
  externalId?: string | null;
  locations: number;
  orders: number;
  /** A contact's customer id, used to masquerade into the company. */
  contactCustomerId?: string;
}

export async function listCompanies(search?: string): Promise<StaffCompany[]> {
  const data = await adminQuery<{
    companies: { edges: Array<{ node: {
      id: string; name: string; externalId?: string | null;
      locationsCount?: { count: number } | null;
      ordersCount?: { count: number } | null;
      mainContact?: { customer?: { id: string } | null } | null;
      contacts: { edges: Array<{ node: { customer?: { id: string } | null } }> };
    } }> };
  }>(
    `query StaffCompanies($query: String) {
      companies(first: 50, query: $query, sortKey: NAME) {
        edges { node {
          id name externalId
          locationsCount { count }
          ordersCount { count }
          mainContact { customer { id } }
          contacts(first: 1) { edges { node { customer { id } } } }
        } }
      }
    }`,
    { query: search || undefined },
  ).catch(() => ({ companies: { edges: [] } }));

  return data.companies.edges.map((e) => ({
    id: e.node.id,
    name: e.node.name,
    externalId: e.node.externalId,
    locations: e.node.locationsCount?.count ?? 0,
    orders: e.node.ordersCount?.count ?? 0,
    contactCustomerId: e.node.mainContact?.customer?.id ?? e.node.contacts.edges[0]?.node.customer?.id,
  }));
}

/** A single selectable contact of a company — the masquerade-target picker row. */
export interface StaffContact {
  /** Customer GID — the masquerade target for this contact. */
  customerId: string;
  name: string;
  email: string;
  /** The contact's company-contact role name (e.g. "Ordering", "Admin"). */
  role?: string;
  /** The contact's assigned location name, if any. */
  location?: string;
}

interface CompanyContactNode {
  customer?: { id: string; displayName?: string | null; email?: string | null } | null;
  roleAssignments?: {
    edges: Array<{
      node: {
        role?: { name?: string | null } | null;
        companyLocation?: { name?: string | null } | null;
      };
    }>;
  } | null;
}

/**
 * List a company's contacts as selectable masquerade targets: each contact's
 * name/email plus their first role name and first assigned-location name. Mirrors
 * the query style of listCompanies (single admin query, defensive on failure).
 */
export async function listCompanyContacts(companyId: string): Promise<StaffContact[]> {
  const data = await adminQuery<{
    company: { contacts: { edges: Array<{ node: CompanyContactNode }> } } | null;
  }>(
    `query CompanyContacts($id: ID!) {
      company(id: $id) {
        contacts(first: 50) {
          edges { node {
            customer { id displayName email }
            roleAssignments(first: 1) {
              edges { node {
                role { name }
                companyLocation { name }
              } }
            }
          } }
        }
      }
    }`,
    { id: companyId },
  ).catch(() => ({ company: null }));

  return (data.company?.contacts.edges ?? [])
    .map((e) => e.node)
    .filter((n): n is CompanyContactNode & { customer: { id: string } } => !!n.customer?.id)
    .map((n) => {
      const assignment = n.roleAssignments?.edges?.[0]?.node;
      return {
        customerId: n.customer.id,
        name: n.customer.displayName || n.customer.email || "Contact",
        email: n.customer.email || "",
        role: assignment?.role?.name || undefined,
        location: assignment?.companyLocation?.name || undefined,
      };
    });
}

/** A customer id for some contact in the company — the masquerade target. */
export async function getCompanyContactCustomerId(companyId: string): Promise<string | null> {
  const data = await adminQuery<{
    company: {
      mainContact?: { customer?: { id: string } | null } | null;
      contacts: { edges: Array<{ node: { customer?: { id: string } | null } }> };
    } | null;
  }>(
    `query CompanyContact($id: ID!) {
      company(id: $id) {
        mainContact { customer { id } }
        contacts(first: 1) { edges { node { customer { id } } } }
      }
    }`,
    { id: companyId },
  ).catch(() => ({ company: null }));

  return (
    data.company?.mainContact?.customer?.id ??
    data.company?.contacts?.edges?.[0]?.node?.customer?.id ??
    null
  );
}
