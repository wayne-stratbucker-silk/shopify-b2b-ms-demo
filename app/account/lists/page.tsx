import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getLists } from "@/lib/lists/client";

export const dynamic = "force-dynamic";

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}

export default async function ListsPage() {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/lists");

  const lists = await getLists(session.companyId ?? "").catch(() => []);

  return (
    <div>
      <div className="page-h">
        <div>
          <h1>Shopping lists</h1>
        </div>
        <form action="/api/lists" method="POST" className="row" style={{ gap: 8 }}>
          <input
            name="name"
            required
            placeholder="New list name"
            className="input"
          />
          <button type="submit" className="btn">+ Create</button>
        </form>
      </div>

      {lists.length === 0 ? (
        <div className="card" style={{ padding: "40px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          No lists yet. Create one above to save products for quick reordering.
        </div>
      ) : (
        <table className="tbl tbl-mobile-cards">
          <thead>
            <tr>
              <th>Name</th>
              <th className="col-hide">Items</th>
              <th className="col-meta">Last updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lists.map(list => (
              <tr key={list.id}>
                <td className="col-primary">
                  <Link href={`/account/lists/${encodeURIComponent(list.id)}`} className="tbl row-link">
                    {list.name}
                  </Link>
                  {list.note && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{list.note}</div>
                  )}
                </td>
                <td className="col-hide mono" style={{ fontSize: 12 }}>
                  {list.items} item{list.items !== 1 ? "s" : ""}
                </td>
                <td className="col-meta muted">{fmtDate(list.lastUsed)}</td>
                <td className="col-action">
                  <Link href={`/account/lists/${encodeURIComponent(list.id)}`} className="btn btn-ghost btn-xs">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
