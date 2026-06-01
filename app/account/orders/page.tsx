import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { adminQuery } from "@/lib/shopify/admin-client";

export const dynamic = "force-dynamic";

const fmt = (n: number, currency = "USD") =>
  n.toLocaleString("en-US", { style: "currency", currency });

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}

function statusCls(s: string): string {
  if (s === "PAID" || s === "FULFILLED") return "ok";
  if (s === "PENDING" || s === "UNFULFILLED") return "info";
  if (s === "REFUNDED" || s === "VOIDED") return "muted";
  return "info";
}

interface ShopifyOrder {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  poNumber?: string;
  customer?: { firstName?: string; lastName?: string };
  lineItems: { edges: Array<{ node: { title: string } }> };
}

async function fetchOrders(companyId: string, viewAll: boolean): Promise<ShopifyOrder[]> {
  const id = companyId.replace("gid://shopify/Company/", "");
  const query = viewAll ? `company_id:${id}` : `company_id:${id}`;
  const data = await adminQuery<{ orders: { edges: Array<{ node: ShopifyOrder }> } }>(
    `query GetOrders($query: String!) {
      orders(first: 50, query: $query, sortKey: CREATED_AT, reverse: true) {
        edges { node {
          id name createdAt displayFinancialStatus displayFulfillmentStatus poNumber
          totalPriceSet { shopMoney { amount currencyCode } }
          customer { firstName lastName }
          lineItems(first: 1) { edges { node { title } } }
        }}
      }
    }`,
    { query }
  ).catch(() => ({ orders: { edges: [] } }));
  return data.orders.edges.map(e => e.node);
}

type Props = { searchParams: Promise<{ view?: string }> };

export default async function OrdersPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/orders");

  const { view } = await searchParams;
  const canViewAll = hasPermission(session.permissions, "company.orders.view_all");
  const showAll = view === "all" && canViewAll;

  const orders = session.companyId ? await fetchOrders(session.companyId, showAll) : [];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 className="text-h1">Orders</h1>
        {canViewAll && (
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/account/orders" className={`btn${!showAll ? " btn-primary" : ""}`} style={{ fontSize: 13 }}>My Orders</Link>
            <Link href="/account/orders?view=all" className={`btn${showAll ? " btn-primary" : ""}`} style={{ fontSize: 13 }}>Company Orders</Link>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No orders yet. <Link href="/" style={{ color: "var(--primary)" }}>Start shopping →</Link>
        </div>
      ) : (
        <div className="card" style={{ overflow: "auto" }}>
          <table className="tbl" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Buyer</th>
                <th>PO #</th>
                <th>Status</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const amt = parseFloat(order.totalPriceSet.shopMoney.amount);
                const buyer = order.customer ? `${order.customer.firstName ?? ""} ${order.customer.lastName ?? ""}`.trim() : "—";
                return (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 600 }}>{order.name}</td>
                    <td className="text-sm">{fmtDate(order.createdAt)}</td>
                    <td className="text-sm">{buyer}</td>
                    <td className="text-sm text-mono">{order.poNumber || "—"}</td>
                    <td>
                      <span className={`status ${statusCls(order.displayFinancialStatus)}`}>
                        {order.displayFinancialStatus}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{fmt(amt, order.totalPriceSet.shopMoney.currencyCode)}</td>
                    <td>
                      <Link href={`/account/orders/${encodeURIComponent(order.id)}`} className="text-sm" style={{ color: "var(--primary)" }}>
                        View →
                      </Link>
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
