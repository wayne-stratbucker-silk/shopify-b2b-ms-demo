import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { adminQuery } from "@/lib/shopify/admin-client";

export async function GET() {
  // This route dumps raw customer/company data — keep it out of production, and
  // never expose it to an impersonated (staff masquerade) session.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no_session" }, { status: 401 });

  if (session.isImpersonated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const result: Record<string, unknown> = {
    sessionCustomerId: session.customerId,
    sessionName: session.name,
    sessionEmail: session.email,
    sessionCompanyId: session.companyId ?? null,
    sessionCompanyName: session.companyName ?? null,
    sessionRole: session.role,
  };

  // Normalize GID
  const rawId = session.customerId;
  let gid: string;
  if (rawId.startsWith("gid://shopify/Customer/") && !rawId.includes("Account")) {
    gid = rawId;
  } else {
    const numericId = rawId.split("/").pop() ?? rawId;
    gid = `gid://shopify/Customer/${numericId}`;
  }
  result.resolvedGid = gid;

  // Full customer query — all company-related fields
  try {
    const basic = await adminQuery<{ customer: {
      id: string; email: string; firstName: string; lastName: string;
      tags: string[];
      defaultAddress?: { company?: string; address1?: string; city?: string };
      addresses: { edges: Array<{ node: { company?: string } }> };
    } | null }>(
      `query($id: ID!) { customer(id: $id) {
        id email firstName lastName tags
        defaultAddress { company address1 city }
        addresses(first: 5) { edges { node { company } } }
      } }`,
      { id: gid }
    );
    result.basicCustomer = basic.customer;
    result.defaultAddressCompany = basic.customer?.defaultAddress?.company ?? null;
    result.allAddressCompanies = basic.customer?.addresses?.edges?.map(e => e.node.company).filter(Boolean) ?? [];
    result.tags = basic.customer?.tags ?? [];
  } catch (e) {
    result.basicCustomerError = String(e);
  }

  // B2B contacts (B2B plan only)
  try {
    const b2b = await adminQuery<{ customer: { companyContactProfiles: Array<{ id: string; company: { id: string; name: string } }> } | null }>(
      `query($id: ID!) { customer(id: $id) { companyContactProfiles { id company { id name } } } }`,
      { id: gid }
    );
    result.companyContacts = b2b.customer?.companyContactProfiles ?? [];
  } catch (e) {
    result.companyContactsError = String(e);
  }

  return NextResponse.json(result);
}
