"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewQuotePage() {
  const router = useRouter();
  const [form, setForm] = useState({ sku: "", quantity: "1", title: "", referenceNumber: "", poNumber: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/quotes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, quantity: parseInt(form.quantity, 10) }),
      });
      const data = await res.json() as { quoteId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create quote");
      router.push(`/account/quotes/${encodeURIComponent(data.quoteId!)}`);
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 className="text-h1" style={{ marginBottom: 24 }}>Request a Quote</h1>
      <form onSubmit={handleSubmit} className="card" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>SKU *</label>
          <input
            className="input"
            required
            placeholder="e.g. THHN-12SOL-250"
            value={form.sku}
            onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--line)", borderRadius: "var(--radius)", fontSize: 14 }}
          />
        </div>

        <div>
          <label className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Quantity *</label>
          <input
            type="number"
            min="1"
            required
            className="input"
            value={form.quantity}
            onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
            style={{ width: 120, padding: "8px 12px", border: "1px solid var(--line)", borderRadius: "var(--radius)", fontSize: 14 }}
          />
        </div>

        <div>
          <label className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Quote Title</label>
          <input
            className="input"
            placeholder="e.g. Warehouse Renovation Phase 1"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--line)", borderRadius: "var(--radius)", fontSize: 14 }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>PO Number</label>
            <input
              className="input"
              placeholder="Optional"
              value={form.poNumber}
              onChange={e => setForm(f => ({ ...f, poNumber: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--line)", borderRadius: "var(--radius)", fontSize: 14 }}
            />
          </div>
          <div>
            <label className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Reference #</label>
            <input
              className="input"
              placeholder="Optional"
              value={form.referenceNumber}
              onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--line)", borderRadius: "var(--radius)", fontSize: 14 }}
            />
          </div>
        </div>

        <div>
          <label className="text-sm" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Notes</label>
          <textarea
            rows={3}
            placeholder="Special requirements, delivery notes..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--line)", borderRadius: "var(--radius)", fontSize: 14, resize: "vertical" }}
          />
        </div>

        {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error}</p>}

        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "Submitting…" : "Submit Quote Request"}
          </button>
          <a href="/account/quotes" className="btn">Cancel</a>
        </div>
      </form>
    </div>
  );
}
