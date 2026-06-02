"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import type { QuoteItem } from "@/types";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

interface Props {
  quoteId: string;
  items: QuoteItem[];
  isAdmin: boolean;
}

export function QuoteLineItems({ quoteId, items, isAdmin }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit(item: QuoteItem) {
    if (!item.lineItemId) return;
    setEditingId(item.lineItemId);
    setEditValue(String(item.quotedPrice));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
    setError(null);
  }

  async function savePrice(item: QuoteItem) {
    if (!item.lineItemId) return;
    const newPrice = parseFloat(editValue);
    if (isNaN(newPrice) || newPrice < 0) {
      setError("Enter a valid price");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_line_price",
          lineItemId: item.lineItemId,
          price: newPrice,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to update price");
        return;
      }
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="card" style={{ overflow: "auto", marginBottom: 16 }}>
        <table className="tbl" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Qty</th>
              <th>List Price</th>
              <th>Quoted Price</th>
              <th>Total</th>
              {isAdmin && <th style={{ width: 48 }}></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const isEditing = isAdmin && item.lineItemId && editingId === item.lineItemId;
              const displayPrice = isEditing
                ? parseFloat(editValue) || 0
                : item.quotedPrice;

              return (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td className="text-sm text-mono">{item.sku}</td>
                  <td>{item.qty}</td>
                  <td className="text-sm" style={{
                    textDecoration: item.quotedPrice < item.listPrice ? "line-through" : "none",
                    color: "var(--muted)",
                  }}>
                    {fmt(item.listPrice)}
                  </td>
                  <td style={{ fontWeight: 600, color: displayPrice < item.listPrice ? "var(--success)" : "inherit" }}>
                    {isEditing ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: "var(--muted)", fontSize: 13 }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="input"
                          style={{ width: 90, padding: "4px 8px", fontSize: 13 }}
                          autoFocus
                          disabled={saving}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") savePrice(item);
                            if (e.key === "Escape") cancelEdit();
                          }}
                        />
                      </div>
                    ) : (
                      fmt(item.quotedPrice)
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {fmt((isEditing ? parseFloat(editValue) || 0 : item.quotedPrice) * item.qty)}
                  </td>
                  {isAdmin && (
                    <td>
                      {item.lineItemId && (
                        isEditing ? (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              className="btn btn-xs btn-primary"
                              onClick={() => savePrice(item)}
                              disabled={saving}
                              title="Save price"
                            >
                              <Icon name="check" size={12} />
                            </button>
                            <button
                              className="btn btn-xs btn-ghost"
                              onClick={cancelEdit}
                              disabled={saving}
                              title="Cancel"
                            >
                              <Icon name="x" size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => startEdit(item)}
                            title="Edit price"
                          >
                            <Icon name="edit" size={13} />
                          </button>
                        )
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {error && (
        <div style={{ fontSize: 12, color: "var(--danger)", padding: "6px 10px", background: "var(--danger-fade, #fff0f0)", borderRadius: "var(--radius)", border: "1px solid var(--danger)", marginBottom: 12 }}>
          {error}
        </div>
      )}
    </>
  );
}
