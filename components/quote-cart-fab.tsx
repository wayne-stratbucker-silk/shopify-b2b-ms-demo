"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { ProductPH } from "@/components/ui/product-placeholder";
import type { QuoteCartLineItem } from "@/types/line-item";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export function QuoteCartFab() {
  const router = useRouter();
  const [items, setItems] = useState<QuoteCartLineItem[]>([]);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/quotes/cart");
      if (!res.ok) return;
      const data = (await res.json()) as { items: QuoteCartLineItem[]; count: number };
      setItems(Array.isArray(data.items) ? data.items : []);
      setCount(data.count);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("quoteCartUpdate", refresh);
    return () => window.removeEventListener("quoteCartUpdate", refresh);
  }, [refresh]);

  // Close popover whenever the cart empties out.
  useEffect(() => {
    if (count === 0 && open) setOpen(false);
  }, [count, open]);

  // Escape to close + restore focus to the FAB.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        fabRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function removeItem(sku: string) {
    setRemoving(sku);
    try {
      await fetch("/api/quotes/cart/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });
      setItems((prev) => prev.filter((i) => i.sku !== sku));
      window.dispatchEvent(new Event("quoteCartUpdate"));
    } catch {
      // leave item in place on failure
    } finally {
      setRemoving(null);
    }
  }

  function viewFullCart() {
    setOpen(false);
    router.push("/account/quotes/cart");
  }

  if (count === 0) return null;

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  return (
    <div className="quote-cart-fab-wrap">
      {open && (
        <>
          {/* Tap-outside backdrop — closes the panel. */}
          <div
            className="qcfab-backdrop"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />

          <div
            ref={panelRef}
            className="qcfab-panel"
            role="dialog"
            aria-modal="false"
            aria-label="Quote cart preview"
          >
            {/* Header */}
            <div className="qcfab-head">
              <span style={{ fontSize: 14, fontWeight: 600 }}>
                Quote cart ({count})
              </span>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  setOpen(false);
                  fabRef.current?.focus();
                }}
                aria-label="Close quote cart preview"
              >
                <Icon name="x" size={15} />
              </button>
            </div>

            {/* Scrollable line items */}
            <div className="qcfab-items">
              {items.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    padding: "24px 0",
                    textAlign: "center",
                    fontSize: 13,
                    color: "var(--muted)",
                  }}
                >
                  No items yet.
                </p>
              ) : (
                items.map((item) => (
                  <div key={item.sku} className="qcfab-item">
                    <div className="qcfab-thumb">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            background: "#fafafa",
                          }}
                        />
                      ) : (
                        <ProductPH style={{ width: "100%", height: "100%" }} />
                      )}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={item.name}
                      >
                        {item.name}
                      </div>
                      <div
                        className="mono"
                        style={{ fontSize: 11, color: "var(--muted)" }}
                      >
                        {item.sku}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>
                        {item.quantity} × {fmt(item.unitPrice)}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 4,
                        flexShrink: 0,
                      }}
                    >
                      <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
                        {fmt(item.unitPrice * item.quantity)}
                      </span>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => removeItem(item.sku)}
                        disabled={removing === item.sku}
                        aria-label={`Remove ${item.name}`}
                        style={{ color: "var(--danger)", padding: "0 6px" }}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer: subtotal + view full cart */}
            <div className="qcfab-foot">
              {items.length > 0 && (
                <div
                  className="row"
                  style={{ justifyContent: "space-between", marginBottom: 10 }}
                >
                  <span style={{ fontSize: 13, color: "var(--ink-2)" }}>Subtotal</span>
                  <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>
                    {fmt(subtotal)}
                  </span>
                </div>
              )}
              <button className="btn btn-block" onClick={viewFullCart}>
                <Icon name="quote" size={15} />
                View quote cart
              </button>
            </div>
          </div>
        </>
      )}

      <button
        ref={fabRef}
        className="quote-cart-fab"
        aria-label={`Quote cart — ${count} item${count === 1 ? "" : "s"}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "relative",
          zIndex: 1,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--primary)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,.24)",
        }}
      >
        <Icon name={open ? "x" : "quote"} size={22} />
        <span
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            minWidth: 20,
            height: 20,
            background: "#fff",
            color: "var(--primary)",
            border: "1px solid var(--primary)",
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
            lineHeight: 1,
          }}
        >
          {count}
        </span>
      </button>
    </div>
  );
}
