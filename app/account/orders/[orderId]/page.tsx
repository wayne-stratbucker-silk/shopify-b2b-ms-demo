import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { adminQuery } from "@/lib/shopify/admin-client";

export const dynamic = "force-dynamic";

const fmt = (n: number, currency = "USD") =>
  n.toLocaleString("en-US", { style: "currency", currency });

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}

interface Props { params: Promise<{ orderId: string }> }

export default async function OrderDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/orders");

  const { orderId } = await params;
  const gid = orderId.startsWith("gid://") ? decodeURIComponent(orderId) : `gid://shopify/Order/${orderId}`;

  const data = await adminQuery<{ order: {
    id: string; name: string; createdAt: string; processedAt: string;
    displayFinancialStatus: string; displayFulfillmentStatus: string;
    poNumber?: string; note?: string;
    totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
    subtotalPriceSet: { shopMoney: { amount: string } };
    totalTaxSet: { shopMoney: { amount: string } };
    shippingAddress?: { name: string; address1: string; city: string; province: string; zip: string; country: string };
    lineItems: { edges: Array<{ node: { id: string; title: string; quantity: number; originalUnitPriceSet: { shopMoney: { amount: string } }; variant?: { sku: string } } }> };
    fulfillments: Array<{ trackingInfo: Array<{ number: string; url?: string }> }>;
  } | null }>(
    `query GetOrder($id: ID!) {
      order(id: $id) {
        id name createdAt processedAt displayFinancialStatus displayFulfillmentStatus poNumber note
        totalPriceSet { shopMoney { amount currencyCode } }
        subtotalPriceSet { shopMoney { amount } }
        totalTaxSet { shopMoney { amount } }
        shippingAddress { name address1 city province zip country }
        lineItems(first: 50) { edges { node { id title quantity originalUnitPriceSet { shopMoney { amount } } variant { sku } } } }
        fulfillments { trackingInfo { number url } }
      }
    }`,
    { id: gid }
  ).catch(() => ({ order: null }));

  const order = data.order;
  if (!order) return notFound();

  const currency = order.totalPriceSet.shopMoney.currencyCode;
  const total = parseFloat(order.totalPriceSet.shopMoney.amount);
  const subtotal = parseFloat(order.subtotalPriceSet.shopMoney.amount);
  const tax = parseFloat(order.totalTaxSet.shopMoney.amount);
  const tracking = order.fulfillments.flatMap(f => f.trackingInfo);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link href="/account/orders" className="text-sm" style={{ color: "var(--muted)" }}>← Orders</Link>
        <h1 className="text-h1" style={{ marginTop: 8 }}>Order {order.name}</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Placed {fmtDate(order.createdAt)}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}>
        {/* Line items */}
        <div>
          <div className="card" style={{ overflow: "auto", marginBottom: 16 }}>
            <table className="tbl" style={{ width: "100%" }}>
              <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
              <tbody>
                {order.lineItems.edges.map(({ node: item }) => {
                  const unit = parseFloat(item.originalUnitPriceSet.shopMoney.amount);
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.title}</td>
                      <td className="text-sm text-mono">{item.variant?.sku || "—"}</td>
                      <td>{item.quantity}</td>
                      <td>{fmt(unit, currency)}</td>
                      <td style={{ fontWeight: 600 }}>{fmt(unit * item.quantity, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {tracking.length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div className="text-h4" style={{ fontWeight: 600, marginBottom: 8 }}>Tracking</div>
              {tracking.map((t, i) => (
                <div key={i} className="text-sm">
                  {t.url ? <a href={t.url} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>{t.number}</a> : t.number}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="text-h4" style={{ fontWeight: 600, marginBottom: 12 }}>Order Summary</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[["Subtotal", fmt(subtotal, currency)], ["Tax", fmt(tax, currency)], ["Total", fmt(total, currency)]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>{l}</span>
                  <span style={{ fontWeight: l === "Total" ? 700 : 400 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
              <span className={`status ${order.displayFinancialStatus === "PAID" ? "ok" : "info"}`}>
                {order.displayFinancialStatus}
              </span>
            </div>
          </div>

          {order.shippingAddress && (
            <div className="card" style={{ padding: 20 }}>
              <div className="text-h4" style={{ fontWeight: 600, marginBottom: 8 }}>Ship To</div>
              <div className="text-sm" style={{ lineHeight: 1.6 }}>
                {order.shippingAddress.name}<br />
                {order.shippingAddress.address1}<br />
                {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zip}<br />
                {order.shippingAddress.country}
              </div>
            </div>
          )}

          {order.poNumber && (
            <div className="card" style={{ padding: 20 }}>
              <div className="text-h4" style={{ fontWeight: 600, marginBottom: 4 }}>PO Number</div>
              <div className="text-mono text-sm">{order.poNumber}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
