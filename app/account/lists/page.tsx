import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getLists } from "@/lib/lists/client";
import { NewListButton, DeleteListButton } from "./lists-client";
import { ListStatusBadge, listStatusFromItems } from "./list-status-badge";

export const dynamic = "force-dynamic";

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}

export default async function ListsPage() {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/lists");

  // Permission-driven, consistent with the other account sub-pages. A B2B buyer
  // with no saved-list permission can't reach this page.
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

  // Shopify metaobject-backed lists are scoped to the company. There's no
  // reliable per-user own-vs-company distinction in the data, so a single
  // company-scoped view is shown (My/Company tabs + Owner column omitted).
  const lists = await getLists(session.companyId ?? "").catch(() => []);

  return (
    <div>
      <div className="page-h">
        <div>
          <h1>Saved lists</h1>
          <p className="sub">{lists.length} {lists.length === 1 ? "list" : "lists"}</p>
        </div>
        {canCreate && (
          <div className="row" style={{ gap: 8 }}>
            <NewListButton />
          </div>
        )}
      </div>

      {lists.length === 0 ? (
        <div className="card" style={{ padding: "40px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          No lists yet. Create one to start organizing your orders.
        </div>
      ) : (
        <div className="card">
          <table className="tbl tbl-mobile-cards">
            <thead>
              <tr>
                <th>Name</th>
                <th className="col-hide">Description</th>
                <th className="col-hide num">Items</th>
                <th>Status</th>
                <th className="col-meta">Last updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lists.map((list) => (
                <tr key={list.id}>
                  <td className="col-primary" style={{ fontWeight: 500 }}>
                    <Link href={`/account/lists/${encodeURIComponent(list.id)}`} className="tbl row-link">
                      {list.name}
                    </Link>
                  </td>
                  <td className="col-hide muted">{list.note || "—"}</td>
                  <td className="col-hide num mono" style={{ fontSize: 12 }}>{list.items}</td>
                  <td className="col-status"><ListStatusBadge status={listStatusFromItems(list.items)} /></td>
                  <td className="col-meta muted">{fmtDate(list.lastUsed)}</td>
                  <td className="col-action">
                    <div className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
                      <Link href={`/account/lists/${encodeURIComponent(list.id)}`} className="btn btn-ghost btn-xs">
                        View
                      </Link>
                      <DeleteListButton listId={list.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
