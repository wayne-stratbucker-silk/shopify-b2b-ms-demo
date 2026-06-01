import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { adminQuery } from "@/lib/shopify/admin-client";

export const dynamic = "force-dynamic";

const fmt = (n: number, currency = "USD") => n.toLocaleString("en-US", { style: "currency", currency });

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}

interface ShopifyOrder {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  paymentTerms?: { paymentSchedules: { edges: Array<{ node: { dueAt?: string; completedAt?: string } }> } };
}

async function fetchInvoiceOrders(companyId: string): Promise<ShopifyOrder[]> {
  const id = companyId.replace("gid://shopify/Company/", "");
  const data = await adminQuery<{ orders: { edges: Array<{ node: ShopifyOrder }> } }>(
    `query GetInvoices($query: String!) {
      orders(first: 50, query: $query, sortKey: CREATED_AT, reverse: true) {
        edges { node {
          id name createdAt displayFinancialStatus
          totalPriceSet { shopMoney { amount currencyCode } }
          paymentTerms {
            paymentSchedules(first: 1) {
              edges { node { dueAt completedAt } }
            }
          }
        }}
      }
    }`,
    { query: `company_id:${id} payment_terms:true` }
  ).catch(() => ({ orders: { edges: [] } }));
  return data.orders.edges.map(e => e.node);
}

export default async function InvoicesPage() {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/invoices");

  if (!hasPermission(session.permissions, "company.invoices.view")) {
    return (
      <div className="card" style={{ padding: 40 }}>
        <h1 className="text-h1" style={{ marginBottom: 8 }}>Invoices</h1>
        <p style={{ color: "var(--muted)" }}>You don&apos;t have permission to view invoices.</p>
      </div>
    );
  }

  const orders = session.companyId ? await fetchInvoiceOrders(session.companyId) : [];

  const open = orders.filter(o => o.displayFinancialStatus !== "PAID" && o.displayFinancialStatus !== "REFUNDED");
  const paid = orders.filter(o => o.displayFinancialStatus === "PAID" || o.displayFinancialStatus === "REFUNDED");

  return (
    <div>
      <h1 className="text-h1" style={{ marginBottom: 8 }}>Invoices</h1>
      <p className="text-sm" style={{ color: "var(--muted)", marginBottom: 24 }}>
        Orders placed on payment terms (Net 30, Net 60, etc.)
      </p>

      {/* KPI tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Open Invoices", value: open.length, sub: "Unpaid" },
          { label: "Paid", value: paid.length, sub: "Settled" },
          { label: "Total Outstanding", value: fmt(open.reduce((s, o) => s + parseFloat(o.totalPriceSet.shopMoney.amount), 0)), sub: "USD" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="card" style={{ padding: 20 }}>
            <div className="text-xs" style={{ color: "var(--muted)", marginBottom: 4 }}>{label}</div>
            <div className="text-h2" style={{ fontWeight: 700 }}>{value}</div>
            <div className="text-xs" style={{ color: "var(--muted-2)" }}>{sub}</div>
          </div>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No invoices found. Orders placed with payment terms will appear here.
        </div>
      ) : (
        <div className="card" style={{ overflow: "auto" }}>
          <table className="tbl" style={{ width: "100%" }}>
            <thead><tr><th>Order #</th><th>Date</th><th>Due Date</th><th>Status</th><th>Amount</th></tr></thead>
            <tbody>
              {orders.map(order => {
                const schedule = order.paymentTerms?.paymentSchedules?.edges?.[0]?.node;
                const dueAt = schedule?.dueAt;
                const isOverdue = dueAt && new Date(dueAt) < new Date() && order.displayFinancialStatus !== "PAID";
                const amt = parseFloat(order.totalPriceSet.shopMoney.amount);
                return (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 600 }}>{order.name}</td>
                    <td className="text-sm">{fmtDate(order.createdAt)}</td>
                    <td className="text-sm" style={{ color: isOverdue ? "var(--danger)" : "inherit" }}>
                      {dueAt ? fmtDate(dueAt) : "—"}
                      {isOverdue && <span style={{ color: "var(--danger)", marginLeft: 4, fontSize: 11 }}>Overdue</span>}
                    </td>
                    <td>
                      <span className={`status ${order.displayFinancialStatus === "PAID" ? "ok" : isOverdue ? "err" : "info"}`}>
                        {order.displayFinancialStatus}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{fmt(amt, order.totalPriceSet.shopMoney.currencyCode)}</td>
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
