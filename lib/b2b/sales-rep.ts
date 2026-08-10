// Assigned sales rep for a company — read from Company metafields
// (namespace "sales_rep"). Shared by the account dashboard and the PDP
// contact card so the buyer sees the same rep everywhere. Request-cached.
//
// Resolution order (Phase 2):
//   1. company `sales_rep.rep` metaobject reference → sales_rep fields
//      (name/title/email/phone). This is the new canonical assignment.
//   2. else the legacy `sales_rep.{name,title,email,phone}` text metafields.
//   3. else null.
// The metaobject reference is resolved with the same pattern as
// lib/b2b/company-files.ts (`reference { ... on Metaobject { fields } }`).

import { cache } from "react";
import { adminQuery } from "@/lib/shopify/admin-client";

export interface SalesRep {
  name: string;
  title: string;
  email?: string;
  phone?: string;
  initials: string;
}

interface RepMetaobjectNode {
  fields: Array<{ key: string; value: string | null }>;
}

function metaobjectField(node: RepMetaobjectNode | null | undefined, key: string): string {
  return node?.fields.find((f) => f.key === key)?.value ?? "";
}

function toSalesRep(name: string, title: string, email: string, phone: string): SalesRep {
  const initials = name.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
  return {
    name,
    initials,
    title,
    email: email || undefined,
    phone: phone || undefined,
  };
}

export const getSalesRep = cache(async (companyId: string | undefined): Promise<SalesRep | null> => {
  if (!companyId || companyId === "default") return null;

  const data = await adminQuery<{
    company: {
      rep?: { reference?: RepMetaobjectNode | null } | null;
      metafields: { edges: Array<{ node: { key: string; value: string } }> };
    } | null;
  }>(
    `query GetSalesRepMeta($id: ID!) {
      company(id: $id) {
        rep: metafield(namespace: "sales_rep", key: "rep") {
          reference { ... on Metaobject { fields { key value } } }
        }
        metafields(first: 10, namespace: "sales_rep") {
          edges { node { key value } }
        }
      }
    }`,
    { id: companyId },
  ).catch(() => ({ company: null }));

  // 1. Canonical assignment via the `sales_rep.rep` metaobject reference.
  const repRef = data.company?.rep?.reference;
  if (repRef) {
    const name = metaobjectField(repRef, "name");
    if (name) {
      return toSalesRep(
        name,
        metaobjectField(repRef, "title"),
        metaobjectField(repRef, "email"),
        metaobjectField(repRef, "phone"),
      );
    }
  }

  // 2. Legacy text metafields (sales_rep.{name,title,email,phone}).
  const mf = data.company?.metafields?.edges?.map((e) => e.node) ?? [];
  const get = (k: string) => mf.find((m) => m.key === k)?.value ?? "";
  const name = get("name");
  if (!name) return null; // 3. nothing assigned.

  return toSalesRep(name, get("title"), get("email"), get("phone"));
});
