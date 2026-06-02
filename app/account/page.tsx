import { getSession } from "@/lib/auth/session";
import { adminQuery } from "@/lib/shopify/admin-client";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface SalesRep { name: string; title: string; email?: string; phone?: string; initials: string }

async function getRecentOrders(companyId: string) {
  const id = companyId.replace("gid://shopify/Company/", "");
  const data = await adminQuery<{
    orders: { edges: Array<{ node: { id: string; name: string; createdAt: string; totalPriceSet: { shopMoney: { amount: string; currencyCode: string } }; displayFinancialStatus: string } }> };
  }>(
    `query RecentOrders($query: String!) {
      orders(first: 5, query: $query, sortKey: CREATED_AT, reverse: true) {
        edges { node { id name createdAt displayFinancialStatus totalPriceSet { shopMoney { amount currencyCode } } } }
      }
    }`,
    { query: `company_id:${id}` }
  ).catch(() => ({ orders: { edges: [] } }));
  return data.orders.edges.map(e => e.node);
}

async function getSalesRep(companyId: string): Promise<SalesRep | null> {
  const data = await adminQuery<{
    company: { metafields: { edges: Array<{ node: { key: string; value: string } }> } } | null;
  }>(
    `query GetSalesRepMeta($id: ID!) {
      company(id: $id) {
        metafields(first: 10, namespace: "sales_rep") {
          edges { node { key value } }
        }
      }
    }`,
    { id: companyId }
  ).catch(() => ({ company: null }));

  const mf = data.company?.metafields?.edges?.map(e => e.node) ?? [];
  if (mf.length === 0) return null;

  const get = (k: string) => mf.find(m => m.key === k)?.value ?? "";
  const name = get("name");
  if (!name) return null;

  const initials = name.split(" ").map((w: string) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
  return { name, initials, title: get("title"), email: get("email") || undefined, phone: get("phone") || undefined };
}

export default async function AccountDashboard() {
  const session = await getSession();
  if (!session) return null;

  const [orders, rep] = await Promise.all([
    session.companyId ? getRecentOrders(session.companyId) : Promise.resolve([]),
    session.companyId ? getSalesRep(session.companyId) : Promise.resolve(null),
  ]);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 className="text-h1">Welcome back, {session.name.split(" ")[0]}</h1>
        {session.companyName && (
          <p className="text-body" style={{ color: "var(--muted)", marginTop: 4 }}>{session.companyName}</p>
        )}
      </div>

      {/* Quick links */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 40 }}>
        {[
          { href: "/account/orders", label: "Orders", icon: "📋" },
          { href: "/account/quotes", label: "Quotes", icon: "💬" },
          { href: "/account/lists", label: "Shopping Lists", icon: "📝" },
          { href: "/account/invoices", label: "Invoices", icon: "🧾" },
          { href: "/account/quick-order", label: "Quick Order", icon: "⚡" },
          { href: "/account/addresses", label: "Addresses", icon: "📍" },
        ].map(({ href, label, icon }) => (
          <Link key={href} href={href} className="card card-h" style={{ padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
            <div className="text-h4" style={{ fontWeight: 600 }}>{label}</div>
          </Link>
        ))}
      </div>

      {/* Recent orders + Sales rep (2-col on desktop) */}
      <div className={rep ? "g2" : ""} style={{ alignItems: "start" }}>
        {/* Recent orders */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 className="text-h2">Recent Orders</h2>
            <Link href="/account/orders" className="text-sm" style={{ color: "var(--primary)" }}>View all →</Link>
          </div>
          {orders.length > 0 ? (
            <div className="card" style={{ overflow: "auto" }}>
              <table className="tbl" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id}>
                      <td><Link href={`/account/orders/${order.id.split("/").pop()}`} style={{ color: "var(--primary)", fontWeight: 600 }}>{order.name}</Link></td>
                      <td className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td><span className="status">{order.displayFinancialStatus}</span></td>
                      <td className="text-sm" style={{ fontWeight: 600 }}>
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: order.totalPriceSet.shopMoney.currencyCode }).format(parseFloat(order.totalPriceSet.shopMoney.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
              No orders yet. <Link href="/" style={{ color: "var(--primary)" }}>Start shopping →</Link>
            </div>
          )}
        </div>

        {/* Sales rep card */}
        {rep && (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>
              Your account rep
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
              <div className="av" style={{ width: 40, height: 40, fontSize: 14, flexShrink: 0 }}>{rep.initials}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{rep.name}</div>
                {rep.title && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{rep.title}</div>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {rep.phone && (
                <a href={`tel:${rep.phone.replace(/\s/g, "")}`} style={{ fontSize: 13, color: "var(--ink-2)", textDecoration: "none" }}>
                  📞 {rep.phone}
                </a>
              )}
              {rep.email && (
                <a href={`mailto:${rep.email}`} style={{ fontSize: 13, color: "var(--primary)", textDecoration: "none" }}>
                  ✉ {rep.email}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
