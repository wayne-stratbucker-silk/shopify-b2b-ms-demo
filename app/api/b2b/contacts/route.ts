import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { adminQuery } from "@/lib/shopify/admin-client";

export const dynamic = "force-dynamic";

// The signed-in user's company contacts — used by the "share list with specific
// people" picker. Returns { customerId, name, email } per contact.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ contacts: [] }, { status: 401 });
  if (!session.companyId) return NextResponse.json({ contacts: [] });

  const data = await adminQuery<{
    company: { contacts: { edges: Array<{ node: { customer: { id: string; email: string; firstName?: string; lastName?: string } } }> } } | null;
  }>(
    `query CompanyContacts($id: ID!) {
      company(id: $id) {
        contacts(first: 50) {
          edges { node { customer { id email firstName lastName } } }
        }
      }
    }`,
    { id: session.companyId },
  ).catch(() => ({ company: null }));

  const contacts = (data.company?.contacts.edges ?? []).map((e) => ({
    customerId: e.node.customer.id,
    email: e.node.customer.email,
    name: `${e.node.customer.firstName ?? ""} ${e.node.customer.lastName ?? ""}`.trim() || e.node.customer.email,
  }));
  return NextResponse.json({ contacts });
}
