import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { adminQuery } from "@/lib/shopify/admin-client";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "no_session" }, { status: 401 });

  const result: Record<string, unknown> = {
    sessionCustomerId: session.customerId,
    sessionName: session.name,
    sessionEmail: session.email,
    sessionCompanyId: session.companyId ?? null,
    sessionCompanyName: session.companyName ?? null,
    sessionRole: session.role,
  };

  // Normalize GID the same way getCustomerWithCompany does
  const rawId = session.customerId;
  let gid: string;
  if (rawId.startsWith("gid://shopify/Customer/") && !rawId.includes("Account")) {
    gid = rawId;
  } else {
    const numericId = rawId.split("/").pop() ?? rawId;
    gid = `gid://shopify/Customer/${numericId}`;
  }
  result.resolvedGid = gid;

  // Step 1: basic customer query
  try {
    const basic = await adminQuery<{ customer: { id: string; email: string; firstName: string; lastName: string } | null }>(
      `query($id: ID!) { customer(id: $id) { id email firstName lastName } }`,
      { id: gid }
    );
    result.basicCustomer = basic.customer;
  } catch (e) {
    result.basicCustomerError = String(e);
  }

  // Step 2: B2B company contacts
  try {
    const b2b = await adminQuery<{ customer: { companyContacts: { edges: Array<{ node: { id: string; company: { id: string; name: string } } }> } } | null }>(
      `query($id: ID!) { customer(id: $id) { companyContacts(first: 5) { edges { node { id company { id name } } } } } }`,
      { id: gid }
    );
    result.companyContacts = b2b.customer?.companyContacts?.edges?.map(e => e.node) ?? [];
  } catch (e) {
    result.companyContactsError = String(e);
  }

  return NextResponse.json(result);
}
