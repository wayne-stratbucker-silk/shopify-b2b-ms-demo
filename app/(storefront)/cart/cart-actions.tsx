"use client";

import { useState } from "react";

interface CartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    sku: string;
    title: string;
    product: { title: string; handle: string };
    price: { amount: string; currencyCode: string };
  };
}

interface CartActionsProps {
  lines: CartLine[];
  checkoutUrl: string;
}

export function CartActions({ lines, checkoutUrl }: CartActionsProps) {
  const [poNumber, setPoNumber] = useState("");
  const [savingList, setSavingList] = useState(false);
  const [listName, setListName] = useState("");
  const [showListDialog, setShowListDialog] = useState(false);
  const [listSaved, setListSaved] = useState(false);
  const [listError, setListError] = useState("");

  function buildCheckoutUrl() {
    if (!poNumber.trim()) return checkoutUrl;
    const url = new URL(checkoutUrl);
    url.searchParams.set("checkout[custom][po_number]", poNumber.trim());
    return url.toString();
  }

  async function handleSaveList() {
    if (!listName.trim()) return;
    setSavingList(true);
    setListError("");
    try {
      const res = await fetch("/api/cart/save-as-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: listName.trim(),
          lines: lines.map((l) => ({
            variantId: l.merchandise.id,
            sku: l.merchandise.sku,
            quantity: l.quantity,
            productHandle: l.merchandise.product.handle,
            productName: l.merchandise.product.title,
          })),
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setListError(d.error ?? "Failed to save list");
        return;
      }
      setListSaved(true);
      setShowListDialog(false);
      setListName("");
    } catch {
      setListError("Network error — please try again.");
    } finally {
      setSavingList(false);
    }
  }

  return (
    <>
      {/* PO Number */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--muted)" }}>
          PO NUMBER (OPTIONAL)
        </label>
        <input
          type="text"
          value={poNumber}
          onChange={(e) => setPoNumber(e.target.value)}
          placeholder="e.g. PO-2025-001"
          style={{
            width: "100%",
            height: 38,
            border: "1px solid var(--line-2)",
            borderRadius: "var(--radius)",
            padding: "0 12px",
            fontSize: 13,
            fontFamily: "var(--font-geist-mono)",
            background: "var(--bg)",
            color: "var(--ink)",
            boxSizing: "border-box",
          }}
        />
        {poNumber.trim() && (
          <p className="text-xs" style={{ color: "var(--muted)", marginTop: 4 }}>
            PO number will be attached to your order at checkout.
          </p>
        )}
      </div>

      {/* Checkout button (replaces the static one) */}
      <a
        href={buildCheckoutUrl()}
        className="btn btn-primary btn-block"
        style={{ textAlign: "center", display: "block", marginBottom: 8 }}
      >
        Proceed to Checkout
      </a>

      {/* Save as list */}
      {listSaved ? (
        <div style={{ textAlign: "center", fontSize: 13, color: "var(--success)", padding: "8px 0" }}>
          ✓ Cart saved as shopping list
        </div>
      ) : (
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => setShowListDialog(true)}
          style={{ textAlign: "center" }}
        >
          Save cart as list
        </button>
      )}

      {/* Save list dialog */}
      {showListDialog && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 900,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div className="card" style={{ padding: 32, width: 360, maxWidth: "90vw" }}>
            <h2 className="text-h3" style={{ fontWeight: 700, marginBottom: 16 }}>Save as shopping list</h2>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--muted)" }}>
              LIST NAME
            </label>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveList()}
              placeholder="e.g. Monthly supplies"
              autoFocus
              style={{
                width: "100%",
                height: 38,
                border: "1px solid var(--line-2)",
                borderRadius: "var(--radius)",
                padding: "0 12px",
                fontSize: 13,
                background: "var(--bg)",
                color: "var(--ink)",
                boxSizing: "border-box",
                marginBottom: 16,
              }}
            />
            {listError && <p style={{ color: "var(--danger)", fontSize: 12, marginBottom: 12 }}>{listError}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveList}
                disabled={savingList || !listName.trim()}
                style={{ flex: 1 }}
              >
                {savingList ? "Saving…" : "Save list"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setShowListDialog(false); setListError(""); }}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
