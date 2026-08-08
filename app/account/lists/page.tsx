import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { adminQuery } from "@/lib/shopify/admin-client";
import { getLists } from "@/lib/lists/client";
import { NewListButton, DeleteListButton } from "./lists-client";
import { ListStatusBadge, listStatusFromItems } from "./list-status-badge";
import type { ListVisibility } from "@/types";

export const dynamic = "force-dynamic";

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}

const VIS_META: Record<ListVisibility, { label: string; cls: string }> = {
  private: { label: "Private", cls: "muted" },
  company: { label: "Company", cls: "info" },
  shared: { label: "Shared", cls: "warn" },
};

// Company contacts → { customerId, name } for the Owner column and share picker.
async function fetchContacts(companyId: string): Promise<Array<{ customerId: string; name: string }>> {
  const data = await adminQuery<{
    company: { contacts: { edges: Array<{ node: { customer: { id: string; email: string; firstName?: string; lastName?: string } } }> } } | null;
  }>(
    `query Contacts($id: ID!) {
      company(id: $id) { contacts(first: 50) { edges { node { customer { id email firstName lastName } } } } }
    }`,
    { id: companyId },
  ).catch(() => ({ company: null }));
  return (data.company?.contacts.edges ?? []).map((e) => ({
    customerId: e.node.customer.id,
    name: `${e.node.customer.firstName ?? ""} ${e.node.customer.lastName ?? ""}`.trim() || e.node.customer.email,
  }));
}

type Props = { searchParams: Promise<{ view?: string }> };

export default async function ListsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/lists");

  const canViewAll = hasPermission(session.permissions, "company.lists.view_all");
  const canViewOwn = hasPermission(session.permissions, "company.lists.view_own");
  if (session.companyId && !canViewAll && !canViewOwn) {
    return (
      <div className="card" style={{ padding: 40 }}>
        <h1 className="text-h1" style={{ marginBottom: 8 }}>Saved lists</h1>
        <p style={{ color: "var(--muted)" }}>You don&apos;t have permission to view shopping lists.</p>
      </div>
    );
  }
  const canCreate = canViewOwn || canViewAll;
  const { view } = await searchParams;
  const tab = view === "company" ? "company" : "my";

  // getLists now honors per-user scope (owner / company / shared-with-me).
  const [accessible, contacts] = await Promise.all([
    getLists(session.companyId ?? "", session.customerId).catch(() => []),
    session.companyId ? fetchContacts(session.companyId) : Promise.resolve([]),
  ]);
  const nameByGid = new Map(contacts.map((c) => [c.customerId, c.name]));
  const ownerName = (gid: string) => (gid === session.customerId ? "You" : nameByGid.get(gid) ?? "—");

  const mine = accessible.filter((l) => l.owner === session.customerId);
  const company = accessible.filter((l) => l.owner !== session.customerId);
  const lists = tab === "company" ? company : mine;

  return (
    <div>
      <div className="page-h">
        <div>
          <h1>Saved lists</h1>
          <p className="sub">{lists.length} {lists.length === 1 ? "list" : "lists"}</p>
        </div>
        <div className="row" style={{ gap: 12, alignItems: "center" }}>
          <div className="row" style={{ gap: 0, borderBottom: "none" }}>
            <Link href="/account/lists" style={{ padding: "0 14px 2px", borderBottom: `2px solid ${tab === "my" ? "var(--primary)" : "transparent"}`, color: tab === "my" ? "var(--primary)" : "var(--muted)", fontSize: 13, fontWeight: tab === "my" ? 500 : 400, textDecoration: "none" }}>
              My lists
            </Link>
            <Link href="/account/lists?view=company" style={{ padding: "0 14px 2px", borderBottom: `2px solid ${tab === "company" ? "var(--primary)" : "transparent"}`, color: tab === "company" ? "var(--primary)" : "var(--muted)", fontSize: 13, fontWeight: tab === "company" ? 500 : 400, textDecoration: "none" }}>
              Company lists
            </Link>
          </div>
          {canCreate && <NewListButton contacts={contacts} />}
        </div>
      </div>

      {lists.length === 0 ? (
        <div className="card" style={{ padding: "40px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          {tab === "company" ? "No company or shared lists yet." : "No lists yet. Create one to start organizing your orders."}
        </div>
      ) : (
        <div className="card">
          <table className="tbl tbl-mobile-cards">
            <thead>
              <tr>
                <th>Name</th>
                <th className="col-hide">Owner</th>
                <th>Visibility</th>
                <th className="col-hide num">Items</th>
                <th>Status</th>
                <th className="col-meta">Last updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lists.map((list) => {
                const vis = VIS_META[list.visibility];
                return (
                  <tr key={list.id}>
                    <td className="col-primary" style={{ fontWeight: 500 }}>
                      <Link href={`/account/lists/${encodeURIComponent(list.id)}`} className="tbl row-link">{list.name}</Link>
                      {list.note && <div className="muted" style={{ fontSize: 12, fontWeight: 400 }}>{list.note}</div>}
                    </td>
                    <td className="col-hide muted">{ownerName(list.owner)}</td>
                    <td className="col-status">
                      <span className={`status status-${vis.cls}`}>{vis.label}{list.visibility === "shared" && list.shared > 0 ? ` · ${list.shared}` : ""}</span>
                    </td>
                    <td className="col-hide num mono" style={{ fontSize: 12 }}>{list.items}</td>
                    <td className="col-status"><ListStatusBadge status={listStatusFromItems(list.items)} /></td>
                    <td className="col-meta muted">{fmtDate(list.lastUsed)}</td>
                    <td className="col-action">
                      <div className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
                        <Link href={`/account/lists/${encodeURIComponent(list.id)}`} className="btn btn-ghost btn-xs">View</Link>
                        {list.owner === session.customerId && <DeleteListButton listId={list.id} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
