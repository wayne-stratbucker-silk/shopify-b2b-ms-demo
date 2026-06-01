import { getSession } from "@/lib/auth/session";
import { adminQuery } from "@/lib/shopify/admin-client";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

export default async function AccountDashboard() {
  const session = await getSession();
  if (!session) return null;

  const orders = session.companyId ? await getRecentOrders(session.companyId) : [];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 className="text-h1">Welcome back, {session.name.split(" ")[0]}</h1>
        {session.companyName && (
          <p className="text-body" style={{ color: "var(--muted)", marginTop: 4 }}>{session.companyName}</p>
        )}
      </div>

      {/* Quick links */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 40 }}>
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

      {/* Recent orders */}
      {orders.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 className="text-h2">Recent Orders</h2>
            <Link href="/account/orders" className="text-sm" style={{ color: "var(--primary)" }}>View all →</Link>
          </div>
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
        </div>
      )}
    </div>
  );
}
