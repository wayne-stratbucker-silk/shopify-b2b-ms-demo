import { MakeswiftComponent } from "@makeswift/runtime/next";
import { getSiteVersion } from "@makeswift/runtime/next/server";
import { getSession } from "@/lib/auth/session";
import { adminQuery } from "@/lib/shopify/admin-client";
import { getCreditLine } from "@/lib/b2b/credit";
import { getSalesRep } from "@/lib/b2b/sales-rep";
import { getQuotesForCustomer } from "@/lib/quotes/client";
import { getLists } from "@/lib/lists/client";
import { CreditLineCard } from "@/components/account/credit-line-card";
import { OpenQuotesCard, SavedListsCard } from "@/components/account/dashboard-regions";
import { client } from "@/lib/makeswift/client";
import Link from "next/link";
// Register the region host + every account card so builder-dropped components
// resolve when this dashboard renders (the account layout only registers the
// header/footer nav).
import "@/components/makeswift/register";

export const dynamic = "force-dynamic";

// Fixed snapshot ids for the three editable dashboard regions — one per
// position, authored independently in the Makeswift builder.
const DASH_REGIONS = {
  top: { id: "acme-account-dash-top", label: "Account Dashboard — Top Region" },
  middle: { id: "acme-account-dash-middle", label: "Account Dashboard — Middle Region" },
  bottom: { id: "acme-account-dash-bottom", label: "Account Dashboard — Bottom Region" },
} as const;

// Editable Makeswift region on the account dashboard (mirrors HeaderNavSlot in
// app/(storefront)/layout.tsx). The region host renders no DOM of its own, so
// dropped components own their spacing; an unauthored/empty region collapses to
// nothing on the live site while staying droppable inside the Makeswift builder.
async function AccountDashboardRegion({ position }: { position: keyof typeof DASH_REGIONS }) {
  const { id, label } = DASH_REGIONS[position];
  const snapshot = await client
    .getComponentSnapshot(id, { siteVersion: getSiteVersion() })
    .catch(() => null);
  if (!snapshot) return null;
  return (
    <div style={position === "top" ? { marginBottom: 24 } : { marginTop: 24 }}>
      <MakeswiftComponent snapshot={snapshot} label={label} type="acme/account-dashboard-region" />
    </div>
  );
}

async function getRecentOrders(companyId: string | undefined, customerId: string) {
  let query: string;
  if (companyId && companyId !== "default") {
    const id = companyId.replace("gid://shopify/Company/", "");
    query = `company_id:${id}`;
  } else {
    // Fall back to customer-level order lookup
    const numId = customerId.replace("gid://shopify/Customer/", "");
    query = `customer_id:${numId}`;
  }
  const data = await adminQuery<{
    orders: { edges: Array<{ node: { id: string; name: string; createdAt: string; totalPriceSet: { shopMoney: { amount: string; currencyCode: string } }; displayFinancialStatus: string } }> };
  }>(
    `query RecentOrders($query: String!) {
      orders(first: 5, query: $query, sortKey: CREATED_AT, reverse: true) {
        edges { node { id name createdAt displayFinancialStatus totalPriceSet { shopMoney { amount currencyCode } } } }
      }
    }`,
    { query }
  ).catch(() => ({ orders: { edges: [] } }));
  return data.orders.edges.map(e => e.node);
}

const fmt = (n: number, currency = "USD") =>
  n.toLocaleString("en-US", { style: "currency", currency });

function fmtDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

function orderStatusCls(s: string): string {
  if (s === "PAID") return "ok";
  if (s === "PENDING" || s === "PARTIALLY_PAID") return "warn";
  if (s === "REFUNDED" || s === "VOIDED") return "muted";
  return "info";
}

export default async function AccountDashboard() {
  const session = await getSession();
  if (!session) return null;

  const firstName = session.name && !session.name.includes("@")
    ? session.name.split(" ")[0]
    : session.email.split("@")[0];

  const [orders, salesRep, credit, quotes, lists] = await Promise.all([
    getRecentOrders(session.companyId, session.customerId),
    getSalesRep(session.companyId),
    getCreditLine(session),
    getQuotesForCustomer(session.customerId).catch(() => []),
    session.companyId && session.companyId !== "default"
      ? getLists(session.companyId).catch(() => [])
      : Promise.resolve([]),
  ]);

  const activeQuotes = quotes.filter((q) => !["ordered", "expired", "archived"].includes(q.status));

  return (
    <div>
      <div className="acct-dash-desktop">
        {/* Greeting */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
            <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-.02em", margin: 0 }}>
              Welcome back, {firstName}
            </h1>
            <div className="row" style={{ gap: 8 }}>
              <Link href="/account/quick-order" className="btn btn-ghost btn-sm">Quick order</Link>
            </div>
          </div>
        </div>

        {/* Editable Makeswift region — top (below greeting) */}
        <AccountDashboardRegion position="top" />

        {/* Credit line summary */}
        {credit && (
          <div style={{ marginBottom: 24, maxWidth: 420 }}>
            <CreditLineCard credit={credit} />
          </div>
        )}

        {/* Row: Recent Orders (wider) + Sales rep (narrower) — stacks on mobile */}
        <div className="dash-orders-row" style={{ marginBottom: 24 }}>
          {/* Recent orders */}
          <div className="card">
            <div className="card-h">
              <h3>Recent orders</h3>
              <Link href="/account/orders" style={{ fontSize: 12, color: "var(--muted)" }}>View all →</Link>
            </div>
            <table className="tbl tbl-mobile-cards">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted" style={{ textAlign: "center", padding: "24px 16px", fontSize: 13 }}>
                      No orders yet.{" "}
                      <Link href="/" style={{ color: "var(--primary)" }}>Start shopping →</Link>
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id}>
                      <td className="col-primary">
                        <Link href={`/account/orders/${o.id.split('/').pop()}`} className="tbl row-link">{o.name}</Link>
                      </td>
                      <td className="col-meta muted">{fmtDate(o.createdAt)}</td>
                      <td className="col-status">
                        <span className={`status status-${orderStatusCls(o.displayFinancialStatus)}`}>{o.displayFinancialStatus}</span>
                      </td>
                      <td className="col-value num">
                        {fmt(parseFloat(o.totalPriceSet.shopMoney.amount), o.totalPriceSet.shopMoney.currencyCode)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Sales rep card */}
          <div className="card">
            <div className="card-h">
              <h3>Your account rep</h3>
            </div>
            {salesRep ? (
              <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div className="av" style={{ width: 44, height: 44, fontSize: 16, flexShrink: 0 }}>{salesRep.initials}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{salesRep.name}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{salesRep.title}</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {salesRep.phone && (
                    <a href={`tel:${salesRep.phone}`} style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center", color: "var(--ink-2)", textDecoration: "none" }}>
                      <span style={{ fontSize: 11, color: "var(--muted)", minWidth: 40 }}>Phone</span>
                      {salesRep.phone}
                    </a>
                  )}
                  {salesRep.email && (
                    <a href={`mailto:${salesRep.email}`} style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center", color: "var(--primary)", textDecoration: "none" }}>
                      <span style={{ fontSize: 11, color: "var(--muted)", minWidth: 40 }}>Email</span>
                      {salesRep.email}
                    </a>
                  )}
                </div>
                {salesRep.email && (
                  <a href={`mailto:${salesRep.email}`} className="btn btn-ghost btn-sm btn-block" style={{ marginTop: "auto", justifyContent: "center" }}>
                    Contact your rep
                  </a>
                )}
              </div>
            ) : (
              <div className="card-b muted" style={{ fontSize: 13, padding: "24px 16px", textAlign: "center" }}>
                No account rep assigned yet.
              </div>
            )}
          </div>
        </div>

        {/* Editable Makeswift region — middle (below the orders/rep row) */}
        <AccountDashboardRegion position="middle" />

        {/* Row: Open quotes + Saved lists */}
        <div className="g2" style={{ marginBottom: 24 }}>
          <OpenQuotesCard quotes={activeQuotes} />
          <SavedListsCard lists={lists} />
        </div>

        {/* Editable Makeswift region — bottom (below all cards) */}
        <AccountDashboardRegion position="bottom" />
      </div>
    </div>
  );
}
