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
