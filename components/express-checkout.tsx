"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

interface ExpressAddress { name: string; company?: string; lines: string[] }
interface ExpressSummary {
  lines: Array<{ title: string; sku?: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: number; tax: number; shipping: number; total: number; currency: string;
  netTerms?: string;
  billingAddress?: ExpressAddress; shippingAddress?: ExpressAddress;
  creditExceeded?: boolean; availableCredit?: number;
}

interface Props {
  eligible: boolean;
  reason?: string;
  netTerms?: string;
}

const REASON_HINT: Record<string, string> = {
  credit_hold: "", // already surfaced by the global credit-hold banner
  no_address: "Add default billing & shipping addresses to your company location to order on account.",
  credit_disabled: "",
  no_permission: "",
  not_b2b: "",
};

export function ExpressCheckout({ eligible, reason, netTerms }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [summary, setSummary] = useState<ExpressSummary | null>(null);
  const [poNumber, setPoNumber] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const fmt = (n: number, c = summary?.currency ?? "USD") =>
    n.toLocaleString("en-US", { style: "currency", currency: c });

  if (!eligible) {
    const hint = reason ? REASON_HINT[reason] : "";
    return hint ? <p className="text-xs" style={{ color: "var(--muted)", marginTop: 8 }}>{hint}</p> : null;
  }

  async function openModal() {
    setOpen(true);
    setLoading(true);
    setSummary(null);
    try {
      const res = await fetch("/api/checkout/express/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(typeof data.error === "string" ? "Couldn't prepare order — please try again." : "Error", "error");
        setOpen(false);
        return;
      }
      setSummary(data.summary as ExpressSummary);
    } catch {
      toast("Couldn't prepare order — please try again.", "error");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  async function place() {
    if (placing || !summary || summary.creditExceeded) return;
    setPlacing(true);
    try {
      const res = await fetch("/api/checkout/express/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poNumber: poNumber.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.message || "Order could not be placed. Please try again.", "error");
        return;
      }
      toast(`Order ${data.orderName ?? ""} placed on account`, "success");
      router.push(data.invoicePath || "/account/orders");
    } catch {
      toast("Order could not be placed. Please try again.", "error");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn-ghost btn-block" style={{ marginBottom: 8 }} onClick={openModal}>
        Place order on account{netTerms ? ` · ${netTerms}` : ""}
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 950, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
             onClick={() => !placing && setOpen(false)}>
          <div className="card" style={{ padding: 0, width: 560, maxWidth: "95vw", maxHeight: "90vh", overflow: "auto" }}
               onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--line)" }}>
              <h2 className="text-h3" style={{ fontWeight: 700 }}>Place order on account</h2>
              <p className="text-sm" style={{ color: "var(--muted)", marginTop: 4 }}>
                Review and confirm. This places an order on your payment terms{summary?.netTerms ? ` (${summary.netTerms})` : ""} — no card required.
              </p>
            </div>

            <div style={{ padding: 24 }}>
              {loading || !summary ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>Preparing order…</div>
              ) : (
                <>
                  {/* Addresses */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                    {summary.shippingAddress && (
                      <div>
                        <div className="text-xs" style={{ textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 4 }}>Ship to</div>
                        <div className="text-sm" style={{ lineHeight: 1.5 }}>
                          {summary.shippingAddress.company && <div style={{ fontWeight: 600 }}>{summary.shippingAddress.company}</div>}
                          {summary.shippingAddress.lines.map((l, i) => <div key={i}>{l}</div>)}
                        </div>
                      </div>
                    )}
                    {summary.billingAddress && (
                      <div>
                        <div className="text-xs" style={{ textTransform: "uppercase", letterSpacing: ".06em", color: "var(--muted)", marginBottom: 4 }}>Bill to</div>
                        <div className="text-sm" style={{ lineHeight: 1.5 }}>
                          {summary.billingAddress.company && <div style={{ fontWeight: 600 }}>{summary.billingAddress.company}</div>}
                          {summary.billingAddress.lines.map((l, i) => <div key={i}>{l}</div>)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Line items */}
                  <table className="tbl" style={{ width: "100%", marginBottom: 16 }}>
                    <thead><tr><th>Item</th><th className="num">Qty</th><th className="num">Total</th></tr></thead>
                    <tbody>
                      {summary.lines.map((l, i) => (
                        <tr key={i}>
                          <td className="text-sm">{l.title}{l.sku ? <span className="text-mono" style={{ color: "var(--muted)", marginLeft: 6 }}>{l.sku}</span> : null}</td>
                          <td className="num">{l.quantity}</td>
                          <td className="num">{fmt(l.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                    {([["Subtotal", summary.subtotal], ["Shipping", summary.shipping], ["Tax", summary.tax]] as const).map(([l, v]) => (
                      <div key={l} className="row" style={{ justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "var(--muted)" }}>{l}</span><span>{fmt(v)}</span>
                      </div>
                    ))}
                    <div className="row" style={{ justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 8, fontWeight: 700 }}>
                      <span>Total</span><span>{fmt(summary.total)}</span>
                    </div>
                  </div>

                  {/* PO number */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--muted)" }}>PO NUMBER (OPTIONAL)</label>
                    <input type="text" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} placeholder="e.g. PO-2025-001"
                           style={{ width: "100%", height: 38, border: "1px solid var(--line-2)", borderRadius: "var(--radius)", padding: "0 12px", fontSize: 13, fontFamily: "var(--font-geist-mono)", background: "var(--bg)", color: "var(--ink)", boxSizing: "border-box" }} />
                  </div>

                  {summary.creditExceeded && (
                    <div role="alert" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 12px", borderRadius: "var(--radius)", fontSize: 13, marginBottom: 16 }}>
                      This order exceeds your available credit{typeof summary.availableCredit === "number" ? ` of ${fmt(summary.availableCredit)}` : ""}.
                      Reduce the order or contact your account rep.
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={place} disabled={placing || summary.creditExceeded}>
                      {placing ? "Placing…" : `Place order · ${fmt(summary.total)}`}
                    </button>
                    <button type="button" className="btn btn-ghost" style={{ flex: "0 0 auto" }} onClick={() => setOpen(false)} disabled={placing}>Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
