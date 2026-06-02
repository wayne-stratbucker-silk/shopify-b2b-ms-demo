"use client";

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { useQtyInput } from "@/lib/use-qty-input";
import { SaveToListModal } from "@/components/save-to-list-modal";
import { StockPill } from "@/components/ui/stock-pill";
import {
  trackViewItem,
  trackAddToCart,
  trackAddToWishlist,
  trackAddToQuote,
  toGa4Item,
} from "@/lib/analytics";
import type { Product } from "@/types";

interface BuyBoxProps {
  product: Product;
  isLoggedIn?: boolean;
  variantId?: number;
  forceOutOfStock?: boolean;
  // Server-rendered Makeswift freight note shown in the Availability box. When
  // omitted, falls back to the original hardcoded line below.
  freightNote?: ReactNode;
}

export function BuyBox({ product: p, isLoggedIn, variantId, forceOutOfStock = false, freightNote }: BuyBoxProps) {
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [creditWarning, setCreditWarning] = useState<{
    type: "outage" | "low-credit" | "over-limit";
    message: string;
  } | null>(null);
  const [addingToQuote, setAddingToQuote] = useState(false);
  const [addedToQuote, setAddedToQuote] = useState(false);

  // Session / permissions — determines CTA order (non-order users lead with Add to Quote)
  const [session, setSession] = useState<{ b2bCompanyId?: number; permissions?: string[] } | null>(null);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.user) setSession(d.user); })
      .catch(() => {});
  }, []);
  // Non-B2B users can always place orders. B2B users need the create permission
  // (configured in BC admin per role — never hardcoded by role number).
  const canPlaceOrders = !session?.b2bCompanyId
    || session?.permissions?.includes("company.orders.create") === true;

  // Stock by location — fetch on mount so the badge total is accurate
  const [stockExpanded, setStockExpanded] = useState(false);
  const [locationWarehouses, setLocationWarehouses] = useState<{ name: string; qty: number; locationId?: number }[] | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const fetchedKey = useRef<string | undefined>(undefined);

  const [showStickyATC, setShowStickyATC] = useState(false);
  const atcRowRef = useRef<HTMLDivElement>(null);

  // GA4 view_item — fire once per product (the PDP is the canonical place
  // for this event; kept here in the client buy-box rather than the server
  // pdp-page so it only fires after hydration in the browser).
  useEffect(() => {
    trackViewItem(toGa4Item(p, { listName: "PDP" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.sku]);

  useEffect(() => {
    const el = atcRowRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyATC(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Untracked products carry no meaningful per-location stock — skip the fetch.
    if (!p.trackInventory) return;
    const key = p.variantId ?? p.id;
    if (fetchedKey.current === key) return;
    setLocationLoading(true);
    const url = p.variantId
      ? `/api/shopify/inventory?variantId=${encodeURIComponent(p.variantId)}`
      : `/api/shopify/inventory?productId=${encodeURIComponent(p.id)}`;
    fetch(url)
      .then((r) => r.json())
      .then((d: { warehouses: { name: string; qty: number; locationId?: number }[] }) => {
        setLocationWarehouses(d.warehouses ?? []);
        fetchedKey.current = key;
      })
      .catch(() => { setLocationWarehouses([]); })
      .finally(() => setLocationLoading(false));
  }, [p.variantId, p.id, p.trackInventory]);

  // Authoritative total: sum of all location quantities once loaded.
  // Fall back to p.stockQty when warehouses is null (not yet loaded) OR an
  // empty array (the API returned no location inventory data for this product).
  const totalStockQty = locationWarehouses !== null && locationWarehouses.length > 0
    ? locationWarehouses.reduce((s, w) => s + w.qty, 0)
    : p.stockQty;

  // forceOutOfStock lets variant selector signal OOS immediately (before warehouse data loads)
  const isOutOfStock = forceOutOfStock || totalStockQty === 0;

  // Determine active tier
  const activeTierIdx = [...p.tiers]
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => qty >= t.minQty)
    .reduce((best, cur) => (cur.t.minQty > best.t.minQty ? cur : best), { t: p.tiers[0], i: 0 }).i;

  const unitPrice = p.tiers[activeTierIdx]?.unitPrice ?? p.price;
  const subtotal = unitPrice * qty;

  const msrpForSavings = p.msrp ?? p.listPrice;
  const savingsPct =
    msrpForSavings > 0 && msrpForSavings > unitPrice
      ? Math.round((1 - unitPrice / msrpForSavings) * 100)
      : 0;

  function decrement() { setQty((q) => Math.max(1, q - 1)); }
  function increment() { setQty((q) => q + 1); }
  function handleQtyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v > 0) setQty(v);
  }
  const qtyHandlers = useQtyInput(setQty);

  const handleAddToCart = useCallback(async () => {
    setAdding(true);
    setCartError(null);
    try {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ sku: p.sku, quantity: qty }] }),
      });
      const data = await res.json() as {
        cartId?: string;
        cartUrl?: string;
        error?: string;
        warning?: { type: "outage" | "low-credit" | "over-limit"; message: string } | null;
      };
      if (!res.ok) {
        setCartError(data.error ?? "Could not add to cart");
        return;
      }
      setAdded(true);
      trackAddToCart([toGa4Item(p, { quantity: qty, price: unitPrice })]);
      setCreditWarning(data.warning ?? null);
      window.dispatchEvent(new Event("storage"));
      setTimeout(() => setAdded(false), 3000);
    } catch {
      setCartError("Network error — please try again");
    } finally {
      setAdding(false);
    }
  }, [p, qty, unitPrice]);

  const handleAddToQuote = useCallback(async () => {
    setAddingToQuote(true);
    try {
      const res = await fetch("/api/quotes/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: p.sku,
          qty,
          productName: p.name,
          unitPrice,
          productId: parseInt(p.id, 10),
          imageUrl: p.images?.[0],
        }),
      });
      if (!res.ok) return;
      setAddedToQuote(true);
      trackAddToQuote([toGa4Item(p, { quantity: qty, price: unitPrice })]);
      window.dispatchEvent(new Event("quoteCartUpdate"));
      setTimeout(() => setAddedToQuote(false), 3000);
    } catch {
      // silently ignore
    } finally {
      setAddingToQuote(false);
    }
  }, [p, qty, unitPrice]);

  return (
    <>
    <div className="col" style={{ gap: 20 }}>
      {/* Price section */}
      <div>
        {isLoggedIn && (
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>
            Your price
          </div>
        )}
        <div className="row" style={{ alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 36, fontWeight: 600, color: "var(--ink)", letterSpacing: "-.02em" }}>
            ${unitPrice.toFixed(2)}
          </span>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>/ea</span>
          {savingsPct > 0 && (
            <span className="badge badge-bulk" style={{ marginLeft: 4 }}>
              {savingsPct}% off MSRP
            </span>
          )}
        </div>

        {/* When on sale: crossed-out regular price + sale badge */}
        {p.wasSalePrice && (
          <div className="row" style={{ gap: 8, marginTop: 4, alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--muted)", textDecoration: "line-through" }}>
              ${p.wasSalePrice.toFixed(2)}
            </span>
            <span className="badge badge-sale">Sale</span>
          </div>
        )}

        {/* MSRP line — shows manufacturer list price when available and above selling price */}
        {p.msrp && p.msrp > unitPrice && (
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            MSRP <span style={{ textDecoration: "line-through" }}>${p.msrp.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Tier table — only shown when more than one tier exists */}
      {p.tiers.length > 1 && (
        <div className="tier">
          <div className="tier-row tier-row-head">
            <span>Qty</span>
            <span>Unit price</span>
            <span>You save</span>
          </div>
          {/* Bulk savings are measured off the default / customer-specific
             price (qty-1 tier), NOT MSRP. */}
          {p.tiers.map((tier, i) => {
            const baseForSavings = p.tiers[0]?.unitPrice ?? p.price;
            const save = baseForSavings > 0 ? Math.round((1 - tier.unitPrice / baseForSavings) * 100) : 0;
            const isActive = i === activeTierIdx;
            return (
              <div key={tier.minQty} className={`tier-row${isActive ? " tier-row-cur" : ""}`}>
                <span style={{ fontWeight: isActive ? 600 : 400 }}>
                  {i < p.tiers.length - 1
                    ? `${tier.minQty}–${p.tiers[i + 1].minQty - 1}`
                    : `${tier.minQty}+`}
                  {isActive && (
                    <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 500, color: "var(--primary)", letterSpacing: ".04em" }}>
                      ← your qty
                    </span>
                  )}
                </span>
                <span className="price">${tier.unitPrice.toFixed(2)}</span>
                <span className="save">{save > 0 ? `${save}% off` : "—"}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Availability */}
      <div style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: "var(--radius-card)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Availability</span>
          <StockPill
            stockQty={totalStockQty}
            lowStockLevel={p.lowStockLevel}
            trackInventory={p.trackInventory}
          />
        </div>
        {freightNote ?? (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            <Icon name="truck" size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            Free freight on orders $500+
          </div>
        )}

        {/* Lead time — display estimate, not an SLA */}
        {(p.leadTimeDays != null) && (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            <Icon name="truck" size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
            {p.leadTimeDays === 0
              ? "Ships today"
              : `Ships in ~${p.leadTimeDays} business day${p.leadTimeDays === 1 ? "" : "s"}`}
          </div>
        )}

        {/* MPN — show when present (may differ from internal SKU) */}
        {p.mpn && p.mpn !== p.sku && (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            MPN: <span className="mono">{p.mpn}</span>
          </div>
        )}

        {/* Customer SKU — Company-specific overlay if applicable */}
        {p.customerSku && p.customerSku !== p.sku && (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            Your SKU: <span className="mono">{p.customerSku}</span>
          </div>
        )}

        {/* Stock by location — only for inventory-tracked products */}
        {p.trackInventory && (
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 8 }}>
          <button
            onClick={() => setStockExpanded((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              fontSize: 12,
              color: "var(--ink)",
              fontWeight: 500,
            }}
          >
            <Icon
              name="chev"
              size={13}
              style={{ transition: "transform .15s", transform: stockExpanded ? "rotate(180deg)" : "rotate(-90deg)" }}
            />
            {stockExpanded ? "Hide stock by location" : "View stock by location"}
          </button>

          {stockExpanded && (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              {locationLoading ? (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Loading…</span>
              ) : locationWarehouses && locationWarehouses.length > 0 ? (
                locationWarehouses.map((wh) => (
                  <div key={wh.name} className="row" style={{ justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "var(--ink-2)" }}>
                      <Icon name="pin" size={11} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                      {wh.name}
                    </span>
                    <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{wh.qty.toLocaleString()}</span>
                  </div>
                ))
              ) : locationWarehouses !== null ? (
                <span style={{ fontSize: 12, color: "var(--muted)" }}>No location data available</span>
              ) : null}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Qty + Line subtotal + Add to cart */}
      <div className="col" style={{ gap: 10 }}>
        {/* Line subtotal — shown ABOVE the Add to cart button */}
        <div style={{ background: "var(--bg-alt)", borderRadius: "var(--radius)", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            Line subtotal ({qty} × ${unitPrice.toFixed(2)})
          </span>
          <span className="mono" style={{ fontSize: 15, fontWeight: 600 }}>
            ${subtotal.toFixed(2)}
          </span>
        </div>

        {/* CTA order swaps based on role: Buyers lead with Add to Quote */}
        {canPlaceOrders ? (
          <>
            <div ref={atcRowRef} className="row" style={{ gap: 12 }}>
              <div className="qty">
                <button onClick={decrement} aria-label="Decrease quantity" disabled={adding}>
                  <Icon name="minus" size={13} />
                </button>
                <input
                  className="qty-input"
                  type="number"
                  min={1}
                  value={qty}
                  onChange={handleQtyChange}
                  onFocus={qtyHandlers.onFocus}
                  onBlur={qtyHandlers.onBlur}
                  aria-label="Quantity"
                  disabled={adding}
                />
                <button onClick={increment} aria-label="Increase quantity" disabled={adding}>
                  <Icon name="plus" size={13} />
                </button>
              </div>
              <button
                className="btn btn-lg"
                style={{ flex: 1, background: added ? "var(--success)" : undefined, transition: "background .2s" }}
                onClick={handleAddToCart}
                disabled={adding || isOutOfStock}
              >
                <Icon name={added ? "check" : "cart"} size={16} />
                {adding ? "Adding…" : added ? "Added!" : isOutOfStock ? "Out of stock" : "Add to cart"}
              </button>
            </div>
            {cartError && (
              <div style={{ fontSize: 12, color: "var(--danger)", padding: "6px 10px", background: "var(--danger-fade, #fff0f0)", borderRadius: "var(--radius)", border: "1px solid var(--danger)" }}>
                {cartError}
              </div>
            )}
            {creditWarning && (
              <div role="status" style={{ fontSize: 12, color: creditWarning.type === "over-limit" ? "var(--danger)" : "var(--warn)", padding: "6px 10px", background: creditWarning.type === "over-limit" ? "var(--danger-fade, #fff0f0)" : "var(--warn-fade, #fff7e8)", borderRadius: "var(--radius)", border: `1px solid ${creditWarning.type === "over-limit" ? "var(--danger)" : "var(--warn)"}` }}>
                {creditWarning.message}
              </div>
            )}
            <button
              className="btn btn-ghost btn-lg btn-block"
              style={{ background: "var(--surface)", borderColor: "var(--line-2)", color: "var(--ink)" }}
              onClick={handleAddToQuote}
              disabled={addingToQuote}
            >
              <Icon name={addedToQuote ? "check" : "quote"} size={16} />
              {addingToQuote ? "Adding…" : addedToQuote ? "Added to quote!" : "Add to quote"}
            </button>
          </>
        ) : (
          <>
            {/* Buyers: Add to Quote is the primary action */}
            <button
              className="btn btn-lg btn-block"
              onClick={handleAddToQuote}
              disabled={addingToQuote}
            >
              <Icon name={addedToQuote ? "check" : "quote"} size={16} />
              {addingToQuote ? "Adding…" : addedToQuote ? "Added to quote!" : "Add to quote"}
            </button>
            <div ref={atcRowRef} className="row" style={{ gap: 12 }}>
              <div className="qty">
                <button onClick={decrement} aria-label="Decrease quantity" disabled={adding}>
                  <Icon name="minus" size={13} />
                </button>
                <input
                  className="qty-input"
                  type="number"
                  min={1}
                  value={qty}
                  onChange={handleQtyChange}
                  onFocus={qtyHandlers.onFocus}
                  onBlur={qtyHandlers.onBlur}
                  aria-label="Quantity"
                  disabled={adding}
                />
                <button onClick={increment} aria-label="Increase quantity" disabled={adding}>
                  <Icon name="plus" size={13} />
                </button>
              </div>
              <button
                className="btn btn-ghost btn-lg"
                style={{ flex: 1 }}
                onClick={handleAddToCart}
                disabled={adding || isOutOfStock}
              >
                <Icon name={added ? "check" : "cart"} size={16} />
                {adding ? "Adding…" : added ? "Added!" : isOutOfStock ? "Out of stock" : "Add to cart"}
              </button>
            </div>
            {cartError && (
              <div style={{ fontSize: 12, color: "var(--danger)", padding: "6px 10px", background: "var(--danger-fade, #fff0f0)", borderRadius: "var(--radius)", border: "1px solid var(--danger)" }}>
                {cartError}
              </div>
            )}
          </>
        )}
        {isLoggedIn && (
          <SaveToListModal
            items={[{
              productId: parseInt(p.id, 10),
              variantId: variantId,
              qty,
            }]}
            onAdded={() => trackAddToWishlist([toGa4Item(p, { quantity: qty, price: unitPrice })])}
            trigger={
              <button
                className="btn btn-ghost btn-lg btn-block"
                style={{ background: "var(--surface)", borderColor: "var(--line-2)", color: "var(--ink)" }}
                type="button"
              >
                <Icon name="heart" size={16} />
                Add to list
              </button>
            }
          />
        )}
      </div>
    </div>

    {/* Sticky ATC — fixed bar that appears when the main ATC scrolls off-screen (mobile only) */}
    {showStickyATC && (
      <div className="sticky-atc">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {p.name}
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              ${unitPrice.toFixed(2)}/ea
            </div>
          </div>
          {canPlaceOrders ? (
            <button
              className="btn btn-sm"
              style={{ background: added ? "var(--success)" : undefined, transition: "background .2s", flexShrink: 0 }}
              onClick={handleAddToCart}
              disabled={adding || isOutOfStock}
            >
              <Icon name={added ? "check" : "cart"} size={14} />
              {adding ? "Adding…" : added ? "Added!" : isOutOfStock ? "Out of stock" : "Add to cart"}
            </button>
          ) : (
            <button
              className="btn btn-sm"
              style={{ flexShrink: 0 }}
              onClick={handleAddToQuote}
              disabled={addingToQuote}
            >
              <Icon name={addedToQuote ? "check" : "quote"} size={14} />
              {addingToQuote ? "Adding…" : addedToQuote ? "Added!" : "Add to quote"}
            </button>
          )}
        </div>
      </div>
    )}
    </>
  );
}
