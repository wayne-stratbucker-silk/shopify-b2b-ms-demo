// Assigned sales rep for a company — read from Company metafields
// (namespace "sales_rep"). Shared by the account dashboard and the PDP
// contact card so the buyer sees the same rep everywhere. Request-cached.

import { cache } from "react";
import { adminQuery } from "@/lib/shopify/admin-client";

export interface SalesRep {
  name: string;
  title: string;
  email?: string;
  phone?: string;
  initials: string;
}

export const getSalesRep = cache(async (companyId: string | undefined): Promise<SalesRep | null> => {
  if (!companyId || companyId === "default") return null;

  const data = await adminQuery<{
    company: { metafields: { edges: Array<{ node: { key: string; value: string } }> } } | null;
  }>(
    `query GetSalesRepMeta($id: ID!) {
      company(id: $id) {
        metafields(first: 10, namespace: "sales_rep") {
          edges { node { key value } }
        }
      }
    }`,
    { id: companyId },
  ).catch(() => ({ company: null }));

  const mf = data.company?.metafields?.edges?.map((e) => e.node) ?? [];
  const get = (k: string) => mf.find((m) => m.key === k)?.value ?? "";
  const name = get("name");
  if (!name) return null;

  const initials = name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
  return {
    name,
    initials,
    title: get("title"),
    email: get("email") || undefined,
    phone: get("phone") || undefined,
  };
});
