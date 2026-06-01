import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { getQuoteCart } from "@/lib/quotes/quote-cart";

export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function QuoteCartPage() {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/quotes/cart");

  const items = await getQuoteCart();
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  if (items.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <h1 className="text-h1" style={{ marginBottom: 16 }}>Quote Cart is Empty</h1>
        <p style={{ color: "var(--muted)", marginBottom: 24 }}>Add products to build a multi-item quote request.</p>
        <Link href="/" className="btn btn-primary">Browse Products</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-h1" style={{ marginBottom: 24 }}>Quote Cart</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24 }}>
        <div className="card" style={{ overflow: "auto" }}>
          <table className="tbl" style={{ width: "100%" }}>
            <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td className="text-mono text-sm">{item.sku}</td>
                  <td>{item.quantity}</td>
                  <td>{fmt(item.price)}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: 24, alignSelf: "start" }}>
          <div className="text-h4" style={{ fontWeight: 600, marginBottom: 16 }}>Summary</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: "var(--muted)" }}>{items.length} item{items.length > 1 ? "s" : ""}</span>
            <span style={{ fontWeight: 600 }}>{fmt(subtotal)}</span>
          </div>
          <p className="text-xs" style={{ color: "var(--muted)", margin: "12px 0" }}>
            Prices shown are list prices. Your sales rep will apply negotiated pricing.
          </p>
          <form action="/api/quotes/cart/submit" method="POST" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button type="submit" className="btn btn-primary btn-block">Submit Quote Request</button>
          </form>
          <form action="/api/quotes/cart/clear" method="POST">
            <button type="submit" className="btn btn-block" style={{ marginTop: 8, fontSize: 12, color: "var(--muted)" }}>
              Clear Cart
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
