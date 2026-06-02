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

async function fetchOrders(companyId: string, viewAll: boolean, email: string): Promise<ShopifyOrder[]> {
  const id = companyId.replace("gid://shopify/Company/", "");
  const query = viewAll ? `company_id:${id}` : `company_id:${id} email:${email}`;
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

  const orders = session.companyId ? await fetchOrders(session.companyId, showAll, session.email) : [];

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const currency = orders[0]?.totalPriceSet.shopMoney.currencyCode ?? "USD";

  const totalOrders = orders.length;
  const mtdValue = orders
    .filter(o => { const d = new Date(o.createdAt); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; })
    .reduce((s, o) => s + parseFloat(o.totalPriceSet.shopMoney.amount), 0);
  const ytdValue = orders
    .filter(o => new Date(o.createdAt).getFullYear() === thisYear)
    .reduce((s, o) => s + parseFloat(o.totalPriceSet.shopMoney.amount), 0);
  const fulfilledCount = orders.filter(o => o.displayFulfillmentStatus === "FULFILLED").length;

  return (
    <div>
      <div className="page-h">
        <div>
          <h1>Orders</h1>
        </div>
        {canViewAll && (
          <div className="row" style={{ gap: 0, borderBottom: "none" }}>
            <Link
              href="/account/orders"
              style={{ padding: "0 16px 2px", borderBottom: `2px solid ${!showAll ? "var(--primary)" : "transparent"}`, color: !showAll ? "var(--primary)" : "var(--muted)", fontSize: 13, fontWeight: !showAll ? 500 : 400, textDecoration: "none" }}
            >
              My orders
            </Link>
            <Link
              href="/account/orders?view=all"
              style={{ padding: "0 16px 2px", borderBottom: `2px solid ${showAll ? "var(--primary)" : "transparent"}`, color: showAll ? "var(--primary)" : "var(--muted)", fontSize: 13, fontWeight: showAll ? 500 : 400, textDecoration: "none" }}
            >
              Company orders
            </Link>
          </div>
        )}
      </div>

      {/* KPI tiles */}
      {totalOrders > 0 && (
        <div className="g4" style={{ marginBottom: 24 }}>
          {[
            { label: "Total orders", value: String(totalOrders) },
            { label: "MTD value", value: fmt(mtdValue, currency) },
            { label: "YTD value", value: fmt(ytdValue, currency) },
            { label: "Fulfilled", value: String(fulfilledCount) },
          ].map(({ label, value }) => (
            <div key={label} className="kpi">
              <div className="lbl">{label}</div>
              <div className="val">{value}</div>
            </div>
          ))}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="card" style={{ padding: "40px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          No orders yet. <Link href="/" style={{ color: "var(--primary)" }}>Start shopping →</Link>
        </div>
      ) : (
        <table className="tbl tbl-mobile-cards">
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Buyer</th>
              <th className="col-hide">PO #</th>
              <th>Status</th>
              <th className="num">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => {
              const amt = parseFloat(order.totalPriceSet.shopMoney.amount);
              const buyer = order.customer ? `${order.customer.firstName ?? ""} ${order.customer.lastName ?? ""}`.trim() : "—";
              return (
                <tr key={order.id}>
                  <td className="col-primary">
                    <Link href={`/account/orders/${encodeURIComponent(order.id)}`} className="tbl row-link">{order.name}</Link>
                  </td>
                  <td className="col-meta muted">{fmtDate(order.createdAt)}</td>
                  <td className="col-meta">{buyer || "—"}</td>
                  <td className="col-hide mono" style={{ fontSize: 12 }}>{order.poNumber || "—"}</td>
                  <td className="col-status">
                    <span className={`status status-${statusCls(order.displayFinancialStatus)}`}>
                      {order.displayFinancialStatus}
                    </span>
                  </td>
                  <td className="col-value num">{fmt(amt, order.totalPriceSet.shopMoney.currencyCode)}</td>
                  <td className="col-action">
                    <Link href={`/account/orders/${encodeURIComponent(order.id)}`} className="btn btn-ghost btn-xs">
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
