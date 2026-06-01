import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { adminQuery } from "@/lib/shopify/admin-client";

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
      <div className="card" style={{ padding: 40 }}>
        <h1 className="text-h1" style={{ marginBottom: 8 }}>Team Members</h1>
        <p style={{ color: "var(--muted)" }}>You don&apos;t have permission to manage users.</p>
      </div>
    );
  }

  const contacts = session.companyId ? await fetchContacts(session.companyId) : [];

  function roleCls(name: string): string {
    const n = name.toLowerCase();
    if (n === "admin") return "err";
    if (n === "buyer") return "info";
    return "muted";
  }

  return (
    <div>
      <h1 className="text-h1" style={{ marginBottom: 24 }}>Team Members</h1>

      {contacts.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No contacts found. Add team members in the Shopify admin.
        </div>
      ) : (
        <div className="card" style={{ overflow: "auto" }}>
          <table className="tbl" style={{ width: "100%" }}>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Location</th></tr></thead>
            <tbody>
              {contacts.map(contact => {
                const name = `${contact.customer.firstName ?? ""} ${contact.customer.lastName ?? ""}`.trim() || "—";
                const assignments = contact.roleAssignments.edges.map(e => e.node);
                const role = assignments[0]?.role?.name ?? "buyer";
                const location = assignments[0]?.companyLocation?.name ?? "All Locations";
                return (
                  <tr key={contact.id}>
                    <td style={{ fontWeight: 600 }}>
                      {name}
                      {contact.isMainContact && (
                        <span className="badge" style={{ marginLeft: 6, fontSize: 10 }}>Main</span>
                      )}
                    </td>
                    <td className="text-sm">{contact.customer.email}</td>
                    <td><span className={`status ${roleCls(role)}`}>{role}</span></td>
                    <td className="text-sm">{location}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ padding: 20, marginTop: 16 }}>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          To invite new team members or change roles, go to your{" "}
          <a href={`https://makeswift-b2b-demo.myshopify.com/admin/companies/${session.companyId?.split("/").pop()}`}
            target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>
            Shopify admin →
          </a>
        </p>
      </div>
    </div>
  );
}
