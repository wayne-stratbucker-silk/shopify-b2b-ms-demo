"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { useQtyInput } from "@/lib/use-qty-input";

interface NewQuoteFormProps {
  sku: string;
  initialQty: number;
  productName: string;
  unitPrice: number;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export function NewQuoteForm({ sku, initialQty, productName, unitPrice }: NewQuoteFormProps) {
  const router = useRouter();
  const [qty, setQty] = useState(initialQty);
  const qtyHandlers = useQtyInput(setQty);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [refNumber, setRefNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = unitPrice * qty;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/quotes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          qty,
          quoteTitle: title || undefined,
          notes: notes || undefined,
          referenceNumber: refNumber || undefined,
        }),
      });
      const data = await res.json() as { quoteId?: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create quote — please try again");
        return;
      }
      router.push(`/account/quotes/${data.quoteId}`);
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Item summary */}
      <div className="card">
        <div className="card-h"><h3>Requested item</h3></div>
        <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{productName}</span>
            <span className="mono muted" style={{ fontSize: 11 }}>{sku}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase" }}>Quantity</div>
              <div className="qty">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  disabled={submitting}
                >
                  <Icon name="minus" size={13} />
                </button>
                <input
                  className="qty-input"
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!isNaN(v) && v > 0) setQty(v);
                  }}
                  onFocus={qtyHandlers.onFocus}
                  onBlur={qtyHandlers.onBlur}
                  aria-label="Quantity"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  aria-label="Increase quantity"
                  disabled={submitting}
                >
                  <Icon name="plus" size={13} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase" }}>Unit price</div>
              <div className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{fmt(unitPrice)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase" }}>Estimated total</div>
              <div className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{fmt(totalAmount)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quote details */}
      <div className="card">
        <div className="card-h"><h3>Quote details</h3></div>
        <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="field">
            <label htmlFor="quote-title">
              Quote title <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span>
            </label>
            <input
              id="quote-title"
              type="text"
              className="input"
              placeholder="e.g. Phase 2 lighting upgrade"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="field">
            <label htmlFor="quote-ref">
              PO / Reference number <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span>
            </label>
            <input
              id="quote-ref"
              type="text"
              className="input"
              placeholder="e.g. PO-2026-0142"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div className="field">
            <label htmlFor="quote-notes">
              Notes for your rep <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span>
            </label>
            <textarea
              id="quote-notes"
              className="input"
              rows={4}
              placeholder="Special requirements, project timeline, delivery needs…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              style={{ resize: "vertical", minHeight: 96 }}
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ fontSize: 13, color: "var(--danger)", padding: "10px 14px", background: "var(--danger-fade, #fff0f0)", borderRadius: "var(--radius)", border: "1px solid var(--danger)" }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="row" style={{ gap: 10 }}>
        <button
          type="submit"
          className="btn btn-lg"
          disabled={submitting}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <Icon name={submitting ? "refresh" : "quote"} size={16} />
          {submitting ? "Submitting…" : "Submit quote request"}
        </button>
        <Link href="/account/quotes" className="btn btn-ghost btn-lg">
          Cancel
        </Link>
      </div>
    </form>
  );
}
