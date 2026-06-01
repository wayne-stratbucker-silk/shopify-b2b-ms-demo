"use client";

import { useState } from "react";

interface QuickOrderRow {
  sku: string;
  qty: string;
  status: "idle" | "loading" | "found" | "notfound";
  name?: string;
  price?: number;
  handle?: string;
  variantId?: string;
  merchandiseId?: string;
}

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export default function QuickOrderPage() {
  const [rows, setRows] = useState<QuickOrderRow[]>([
    { sku: "", qty: "1", status: "idle" },
  ]);
  const [adding, setAdding] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  function addRow() {
    setRows(r => [...r, { sku: "", qty: "1", status: "idle" }]);
  }

  function updateRow(i: number, updates: Partial<QuickOrderRow>) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, ...updates } : row));
  }

  async function lookupSku(i: number, sku: string) {
    if (!sku.trim()) return;
    updateRow(i, { status: "loading" });
    try {
      const res = await fetch(`/api/shopify/product-by-sku?sku=${encodeURIComponent(sku)}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json() as { name: string; price: number; handle: string; variantId: string; merchandiseId: string };
      updateRow(i, { status: "found", ...data });
    } catch {
      updateRow(i, { status: "notfound" });
    }
  }

  async function addAllToCart() {
    const validRows = rows.filter(r => r.status === "found" && r.merchandiseId);
    if (!validRows.length) return;
    setAdding(true);
    let count = 0;
    for (const row of validRows) {
      try {
        const res = await fetch("/api/cart/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merchandiseId: row.merchandiseId, quantity: parseInt(row.qty, 10) }),
        });
        if (res.ok) count++;
      } catch { /* skip */ }
    }
    setAddedCount(count);
    setAdding(false);
  }

  return (
    <div>
      <h1 className="text-h1" style={{ marginBottom: 8 }}>Quick Order</h1>
      <p className="text-sm" style={{ color: "var(--muted)", marginBottom: 24 }}>
        Enter SKUs to quickly add multiple products to your cart.
      </p>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", fontSize: 12, color: "var(--muted)", paddingBottom: 8, fontWeight: 600 }}>SKU</th>
              <th style={{ textAlign: "left", fontSize: 12, color: "var(--muted)", paddingBottom: 8, fontWeight: 600, width: 100 }}>Qty</th>
              <th style={{ textAlign: "left", fontSize: 12, color: "var(--muted)", paddingBottom: 8, fontWeight: 600 }}>Product</th>
              <th style={{ textAlign: "right", fontSize: 12, color: "var(--muted)", paddingBottom: 8, fontWeight: 600 }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
                <td style={{ padding: "8px 8px 8px 0", verticalAlign: "middle" }}>
                  <input
                    value={row.sku}
                    onChange={e => updateRow(i, { sku: e.target.value, status: "idle" })}
                    onBlur={e => lookupSku(i, e.target.value)}
                    onKeyDown={e => e.key === "Enter" && lookupSku(i, row.sku)}
                    placeholder="Enter SKU"
                    style={{ padding: "6px 10px", border: "1px solid var(--line)", borderRadius: "var(--radius)", fontSize: 14, width: "100%" }}
                  />
                </td>
                <td style={{ padding: "8px", verticalAlign: "middle" }}>
                  <input
                    type="number"
                    min="1"
                    value={row.qty}
                    onChange={e => updateRow(i, { qty: e.target.value })}
                    style={{ padding: "6px 10px", border: "1px solid var(--line)", borderRadius: "var(--radius)", fontSize: 14, width: "100%" }}
                  />
                </td>
                <td style={{ padding: "8px", verticalAlign: "middle", fontSize: 14 }}>
                  {row.status === "loading" && <span style={{ color: "var(--muted)" }}>Looking up…</span>}
                  {row.status === "found" && <span style={{ color: "var(--success)", fontWeight: 500 }}>{row.name}</span>}
                  {row.status === "notfound" && <span style={{ color: "var(--danger)" }}>SKU not found</span>}
                </td>
                <td style={{ padding: "8px 0 8px 8px", textAlign: "right", verticalAlign: "middle", fontWeight: 600, fontSize: 14 }}>
                  {row.status === "found" && row.price ? fmt(row.price) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addRow} className="text-sm" style={{ marginTop: 12, background: "none", border: "none", color: "var(--primary)", cursor: "pointer", padding: 0 }}>
          + Add another row
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          onClick={addAllToCart}
          disabled={adding || !rows.some(r => r.status === "found")}
          className="btn btn-primary"
        >
          {adding ? "Adding…" : `Add ${rows.filter(r => r.status === "found").length} Item(s) to Cart`}
        </button>
        {addedCount > 0 && (
          <span style={{ color: "var(--success)", fontSize: 13 }}>✓ {addedCount} item{addedCount > 1 ? "s" : ""} added</span>
        )}
      </div>
    </div>
  );
}
