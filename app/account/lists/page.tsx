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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 className="text-h1">Shopping Lists</h1>
        <form action="/api/lists" method="POST" style={{ display: "flex", gap: 8 }}>
          <input
            name="name"
            required
            placeholder="New list name"
            style={{ padding: "8px 12px", border: "1px solid var(--line)", borderRadius: "var(--radius)", fontSize: 14 }}
          />
          <button type="submit" className="btn btn-primary">+ Create</button>
        </form>
      </div>

      {lists.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No lists yet. Create one to save products for quick reordering.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {lists.map(list => (
            <Link key={list.id} href={`/account/lists/${encodeURIComponent(list.id)}`} className="card card-h" style={{ padding: 20, textDecoration: "none" }}>
              <div className="text-h4" style={{ fontWeight: 600, marginBottom: 4 }}>{list.name}</div>
              {list.note && <p className="text-sm" style={{ color: "var(--muted)", marginBottom: 4 }}>{list.note}</p>}
              <p className="text-xs" style={{ color: "var(--muted-2)" }}>
                {list.items} item{list.items !== 1 ? "s" : ""} · Updated {fmtDate(list.lastUsed)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
