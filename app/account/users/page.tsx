import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { adminQuery } from "@/lib/shopify/admin-client";
import { UsersClient } from "./users-client";

export const dynamic = "force-dynamic";

interface CompanyContact {
  id: string;
  isMainContact: boolean;
  customer: { id: string; email: string; firstName?: string; lastName?: string };
  roleAssignments: { edges: Array<{ node: { role: { name: string }; companyLocation: { id: string; name: string } } }> };
}

async function fetchContacts(companyId: string): Promise<CompanyContact[]> {
  const data = await adminQuery<{
    company: {
      contacts: { edges: Array<{ node: CompanyContact }> };
    } | null;
  }>(
    `query GetContacts($id: ID!) {
      company(id: $id) {
        contacts(first: 50) {
          edges { node {
            id isMainContact
            customer { id email firstName lastName }
            roleAssignments(first: 5) {
              edges { node {
                role { name }
                companyLocation { id name }
              }}
            }
          }}
        }
      }
    }`,
    { id: companyId }
  ).catch(() => ({ company: null }));
  return data.company?.contacts?.edges?.map(e => e.node) ?? [];
}

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/users");

  if (!hasPermission(session.permissions, "company.users.manage")) {
    return (
      <div>
        <div className="page-h">
          <h1>Team members</h1>
        </div>
        <div className="card" style={{ padding: "24px 20px" }}>
          <p className="muted" style={{ fontSize: 13 }}>You don&apos;t have permission to manage users.</p>
        </div>
      </div>
    );
  }

  const contacts = session.companyId ? await fetchContacts(session.companyId) : [];

  const members = contacts.map((c) => {
    const assignments = c.roleAssignments.edges.map((e) => e.node);
    return {
      id: c.id,
      isMainContact: c.isMainContact,
      customerId: c.customer.id,
      email: c.customer.email,
      name: `${c.customer.firstName ?? ""} ${c.customer.lastName ?? ""}`.trim() || "—",
      role: assignments[0]?.role?.name ?? "buyer",
      location: assignments[0]?.companyLocation?.name ?? "All Locations",
    };
  });

  return <UsersClient members={members} currentEmail={session.email} />;
}
