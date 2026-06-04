"use client";

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { liteClient } from "algoliasearch/lite";
import { Icon } from "@/components/ui/icons";
import { normalizeHit, type RawConnectorHit } from "@/lib/algolia/connector-hit";
import { formatLineName, type NameOptionPair } from "@/lib/format-line-name";

// ─── Algolia (mobile typeahead) ───────────────────────────────────────────────
// Mirrors the storefront search index. Falls back gracefully when env vars are
// missing — users can still type SKUs directly into the bar.
const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
const INDEX = process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ?? "shopify_products";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const searchClient: any = APP_ID && SEARCH_KEY ? liteClient(APP_ID, SEARCH_KEY) : null;

interface AlgoliaHit {
  objectID: string;
  sku: string;
  name: string;
  brand?: string;
  price?: number;
  stockQty?: number;
}

function brandInitials(brand?: string): string {
  if (!brand) return "–";
  const words = brand.trim().split(/\s+/);
  return words.length === 1
    ? words[0].slice(0, 2).toUpperCase()
    : (words[0][0] + words[1][0]).toUpperCase();
}

type RowStatus = "idle" | "loading" | "found" | "not-found";

// Shopify variant IDs are GIDs (strings) and double as cart merchandise IDs.
interface VariantOption {
  id: string;
  sku: string;
  label: string;
  optionName: string;
  price?: number;
  stock?: number;
}

interface SkuRow {
  id: string;
  sku: string;
  qty: string;
  name?: string;
  unitPrice?: number;
  listPrice?: number;
  stock?: number;
  status: RowStatus;
  variants?: VariantOption[];
  selectedVariantId?: string;
  selectedVariantSku?: string;
  selectedVariantPrice?: number;
  productId?: string;
  merchandiseId?: string; // resolved variant GID for simple products
}

// Name + selected-variant suffix for a resolved row (e.g. "Cable (Length: 50 ft)").
function rowDisplayName(row: SkuRow): string {
  const name = row.name ?? row.sku;
  if (!row.variants?.length || row.selectedVariantId == null) return name;
  const v = row.variants.find((vv) => vv.id === row.selectedVariantId);
  if (!v) return name;
  const pairs: NameOptionPair[] = [{ name: v.optionName, value: v.label }];
  return formatLineName(name, pairs);
}

// The merchandise (variant GID) a ready row will add to cart.
function rowMerchandiseId(row: SkuRow): string | undefined {
  return row.selectedVariantId ?? row.merchandiseId;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function newRow(): SkuRow {
  return { id: Math.random().toString(36).slice(2), sku: "", qty: "1", status: "idle" };
}

const EMPTY_ROWS = Array.from({ length: 8 }, newRow);

interface LookupResponse {
  name: string;
  unitPrice?: number;
  listPrice?: number;
  stock?: number;
  variants?: VariantOption[];
  productId?: string;
  merchandiseId?: string;
}

export default function QuickOrderPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SkuRow[]>(EMPTY_ROWS);
  const [cartLoading, setCartLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [cartError, setCartError] = useState("");
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [session, setSession] = useState<{ companyId?: string; permissions?: string[] } | null>(null);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Mobile typeahead ──
  const [mobileQuery, setMobileQuery] = useState("");
  const [mobileResults, setMobileResults] = useState<AlgoliaHit[]>([]);
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);
  const mobileDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.user) setSession(d.user); })
      .catch(() => {});
  }, []);

  // Non-B2B users can always place orders. B2B users need the create permission.
  const canPlaceOrders = !session?.companyId
    || session?.permissions?.includes("company.orders.create") === true;

  // ── SKU lookup ────────────────────────────────────────────────────────────

  const lookupSku = useCallback(async (rowId: string, sku: string) => {
    if (!sku.trim()) {
      setRows((prev) => prev.map((r) =>
        r.id === rowId
          ? { ...r, status: "idle", name: undefined, unitPrice: undefined, listPrice: undefined, stock: undefined, variants: undefined, selectedVariantId: undefined, selectedVariantSku: undefined, selectedVariantPrice: undefined, merchandiseId: undefined }
          : r
      ));
      return;
    }
    setRows((prev) => prev.map((r) => r.id === rowId ? { ...r, status: "loading" } : r));
    try {
      const res = await fetch(`/api/shopify/product-by-sku?sku=${encodeURIComponent(sku.trim())}`);
      if (!res.ok) throw new Error("not found");
      const match = await res.json() as LookupResponse;
      const firstVariant = match.variants?.[0];
      setRows((prev) => prev.map((r) =>
        r.id === rowId
          ? {
              ...r,
              status: "found",
              name: match.name,
              unitPrice: firstVariant?.price ?? match.unitPrice,
              listPrice: match.listPrice,
              stock: match.stock,
              variants: match.variants,
              selectedVariantId: firstVariant?.id,
              selectedVariantSku: firstVariant?.sku,
              selectedVariantPrice: firstVariant?.price,
              productId: match.productId,
              merchandiseId: match.merchandiseId,
            }
          : r
      ));
    } catch {
      setRows((prev) => prev.map((r) =>
        r.id === rowId
          ? { ...r, status: "not-found", name: undefined, unitPrice: undefined, listPrice: undefined, stock: undefined, variants: undefined, selectedVariantId: undefined, selectedVariantSku: undefined, selectedVariantPrice: undefined, merchandiseId: undefined }
          : r
      ));
    }
  }, []);

  function handleSkuChange(rowId: string, value: string) {
    setRows((prev) => prev.map((r) =>
      r.id === rowId
        ? { ...r, sku: value, status: "idle", name: undefined, unitPrice: undefined, variants: undefined, selectedVariantId: undefined, selectedVariantSku: undefined, selectedVariantPrice: undefined, merchandiseId: undefined }
        : r
    ));
    clearTimeout(debounceTimers.current[rowId]);
    debounceTimers.current[rowId] = setTimeout(() => lookupSku(rowId, value), 400);
  }

  function handleSkuBlur(rowId: string, sku: string) {
    clearTimeout(debounceTimers.current[rowId]);
    lookupSku(rowId, sku);
  }

  function handleSkuKeyDown(e: KeyboardEvent<HTMLInputElement>, _rowId: string, rowIndex: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      const inputs = document.querySelectorAll<HTMLInputElement>(".qo-sku");
      inputs[rowIndex + 1]?.focus();
    }
  }

  function handleQtyChange(rowId: string, value: string) {
    setRows((prev) => prev.map((r) => r.id === rowId ? { ...r, qty: value } : r));
  }

  function handleVariantChange(rowId: string, variantId: string) {
    setRows((prev) => prev.map((r) => {
      if (r.id !== rowId) return r;
      const v = r.variants?.find((vv) => vv.id === variantId);
      return {
        ...r,
        selectedVariantId: v?.id,
        selectedVariantSku: v?.sku,
        selectedVariantPrice: v?.price,
        unitPrice: v?.price ?? r.unitPrice,
      };
    }));
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  function clearAll() {
    setRows(EMPTY_ROWS.map(() => newRow()));
    setCartError("");
    setQuoteSuccess(false);
  }

  // ── Mobile typeahead wiring ─────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(mobileDebounceRef.current);
    if (!mobileQuery.trim() || !searchClient) {
      setMobileResults([]);
      setShowMobileDropdown(false);
      return;
    }
    mobileDebounceRef.current = setTimeout(async () => {
      try {
        const response = await searchClient.search({
          requests: [{ indexName: INDEX, query: mobileQuery.trim(), hitsPerPage: 6 }],
        });
        const raw: RawConnectorHit[] = response.results?.[0]?.hits ?? [];
        const hits: AlgoliaHit[] = raw.map((h) => normalizeHit(h) as unknown as AlgoliaHit);
        setMobileResults(hits);
        setShowMobileDropdown(hits.length > 0);
      } catch {
        setMobileResults([]);
      }
    }, 200);
    return () => clearTimeout(mobileDebounceRef.current);
  }, [mobileQuery]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        !mobileDropdownRef.current?.contains(e.target as Node) &&
        !mobileSearchRef.current?.contains(e.target as Node)
      ) {
        setShowMobileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function addFromAlgolia(hit: AlgoliaHit) {
    // If we already have this SKU resolved, just bump the qty.
    const existing = rows.find((r) => r.sku === hit.sku && r.status === "found");
    if (existing) {
      handleQtyChange(existing.id, String((parseInt(existing.qty, 10) || 0) + 1));
    } else {
      const entry: SkuRow = {
        id: Math.random().toString(36).slice(2),
        sku: hit.sku,
        qty: "1",
        name: hit.name,
        unitPrice: hit.price,
        stock: hit.stockQty,
        status: "found",
      };
      // Replace the first empty/idle row, or append. Then kick off a real
      // lookup to populate variants and list price.
      setRows((prev) => {
        const emptyIdx = prev.findIndex((r) => r.status === "idle" && !r.sku);
        if (emptyIdx >= 0) {
          const next = [...prev];
          next[emptyIdx] = entry;
          return next;
        }
        return [...prev, entry];
      });
      lookupSku(entry.id, hit.sku);
    }
    setMobileQuery("");
    setMobileResults([]);
    setShowMobileDropdown(false);
    mobileSearchRef.current?.focus();
  }

  function removeRow(rowId: string) {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  }

  // Derived data for the mobile "resolved rows" list — show only entries the
  // user has actively resolved (skip the prefilled empty placeholders).
  const mobileResolvedRows = rows.filter((r) => r.status === "found" || r.status === "loading" || r.status === "not-found");

  // ── Computed ────────────────────────────────────────────────────────────

  const readyRows = rows.filter((r) => r.status === "found" && r.sku && (parseInt(r.qty, 10) || 0) > 0);
  const readyRowsValid = readyRows.filter((r) => !r.variants?.length || r.selectedVariantId != null);
  const subtotal = readyRowsValid.reduce((s, r) => s + (r.unitPrice ?? 0) * (parseInt(r.qty, 10) || 0), 0);
  const listTotal = readyRowsValid.reduce((s, r) => s + (r.listPrice ?? r.unitPrice ?? 0) * (parseInt(r.qty, 10) || 0), 0);
  const savings = listTotal - subtotal;
  const hasUnselectedVariants = readyRows.length > 0 && readyRows.length !== readyRowsValid.length;

  // ── Add to cart ────────────────────────────────────────────────────────

  async function handleAddToCart() {
    if (!readyRowsValid.length) return;
    setCartLoading(true);
    setCartError("");
    try {
      const items = readyRowsValid
        .map((r) => ({ merchandiseId: rowMerchandiseId(r), quantity: parseInt(r.qty, 10) || 1 }))
        .filter((i): i is { merchandiseId: string; quantity: number } => !!i.merchandiseId);
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json() as { cartUrl?: string; error?: string };
      if (res.ok) {
        router.push(data.cartUrl ?? "/cart");
      } else {
        setCartError(data.error ?? "Failed to add to cart. Please try again.");
      }
    } catch {
      setCartError("Network error. Please try again.");
    } finally {
      setCartLoading(false);
    }
  }

  // ── Add to quote ────────────────────────────────────────────────────────

  async function handleAddToQuote() {
    if (!readyRowsValid.length) return;
    setQuoteLoading(true);
    setCartError("");
    setQuoteSuccess(false);
    try {
      // Bake the suffixed display name in so the quote cart renders
      // "Name (Option: Value)". The quote-cart endpoint resolves the variant
      // server-side from the SKU, so we send the selected variant's SKU.
      //
      // Sequential, not parallel: the endpoint does a read-modify-write on a
      // single Shopify draft order keyed by a cookie. Firing concurrently races
      // the first request's cookie set and can spawn duplicate carts or drop
      // items, so each add must observe the previous one's result.
      for (const r of readyRowsValid) {
        await fetch("/api/quotes/cart/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: (r.selectedVariantSku ?? r.sku).trim(),
            qty: parseInt(r.qty, 10) || 1,
            productName: rowDisplayName(r),
            unitPrice: r.unitPrice ?? 0,
          }),
        });
      }
      window.dispatchEvent(new Event("quoteCartUpdate"));
      router.push("/account/quotes/cart");
    } catch {
      setCartError("Failed to add to quote. Please try again.");
    } finally {
      setQuoteLoading(false);
    }
  }

  // ── Paste parser ────────────────────────────────────────────────────────

  function parsePasteLines() {
    const newRows = pasteText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith("#") && !line.toLowerCase().startsWith("sku"))
      .map((line) => {
        const parts = line.split(/\t|,/);
        const r = newRow();
        r.sku = (parts[0] ?? "").trim().toUpperCase();
        r.qty = (parts[1] ?? "1").trim() || "1";
        return r;
      })
      .filter((r) => r.sku.length > 0);
    if (newRows.length) {
      const padded = newRows.length < 5 ? [...newRows, ...Array.from({ length: 5 - newRows.length }, newRow)] : newRows;
      setRows(padded);
      setPasteText("");
      padded.forEach((r) => { if (r.sku) lookupSku(r.id, r.sku); });
    }
  }

  // ── File upload ────────────────────────────────────────────────────────

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const newRows = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !line.startsWith("#") && !line.toLowerCase().startsWith("sku"))
        .map((line) => {
          const parts = line.split(/\t|,/);
          const r = newRow();
          r.sku = (parts[0] ?? "").trim().toUpperCase();
          r.qty = (parts[1] ?? "1").trim() || "1";
          return r;
        })
        .filter((r) => r.sku.length > 0);
      if (newRows.length) {
        const padded = newRows.length < 5 ? [...newRows, ...Array.from({ length: 5 - newRows.length }, newRow)] : newRows;
        setRows(padded);
        padded.forEach((r) => { if (r.sku) lookupSku(r.id, r.sku); });
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  }

  return (
    <div>
      <div className="page-h">
        <div>
          <h1>Quick order</h1>
          <p className="sub">Order by SKU — type, paste, or upload a CSV</p>
        </div>
      </div>

      <div className="qo-page-layout" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        {/* Main pad */}
        <div>
          {/* Desktop entry — full card hidden ≤768px in favour of the
              strip-style mobile block that follows. */}
          <div className="qo-entry-desktop">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-h">
              <h3>Enter SKUs</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>Clear all</button>
            </div>

            <div>
            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 80px 1.4fr 100px 36px", padding: "8px 16px", background: "var(--surface-2)", borderBottom: "1px solid var(--line)", fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", gap: 8 }}>
              <span>SKU / MPN</span>
              <span style={{ textAlign: "center" }}>Qty</span>
              <span>Product / Variant</span>
              <span style={{ textAlign: "right" }}>Unit price</span>
              <span />
            </div>

            {rows.map((row, i) => (
              <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1.8fr 80px 1.4fr 100px 36px", padding: "10px 16px", borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : undefined, alignItems: "center", gap: 8 }}>
                <input
                  className="input mono qo-sku"
                  type="text"
                  value={row.sku}
                  onChange={(e) => handleSkuChange(row.id, e.target.value)}
                  onBlur={(e) => handleSkuBlur(row.id, e.target.value)}
                  onKeyDown={(e) => handleSkuKeyDown(e, row.id, i)}
                  placeholder="Type SKU…"
                  style={{ height: 32, fontSize: 12, fontFamily: "var(--font-geist-mono, monospace)" }}
                />
                <input
                  className="input mono qty-input"
                  type="number"
                  min={1}
                  value={row.qty}
                  onChange={(e) => handleQtyChange(row.id, e.target.value)}
                  onFocus={() => handleQtyChange(row.id, "")}
                  onBlur={(e) => { if (!e.target.value || parseInt(e.target.value, 10) < 1) handleQtyChange(row.id, "1"); }}
                  style={{ height: 32, fontSize: 12, textAlign: "center" }}
                />
                <div style={{ minWidth: 0, fontSize: 12 }}>
                  {row.status === "loading" && <span className="muted">Looking up…</span>}
                  {row.status === "found" && (
                    <div>
                      <div style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{rowDisplayName(row)}</div>
                      {row.variants && row.variants.length > 0 ? (
                        <select
                          className="select"
                          style={{ marginTop: 4, height: 26, fontSize: 11, width: "100%", maxWidth: 220 }}
                          value={row.selectedVariantId ?? ""}
                          onChange={(e) => handleVariantChange(row.id, e.target.value)}
                        >
                          <option value="" disabled>Select {row.variants[0].optionName}…</option>
                          {row.variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.label}{v.stock != null ? ` (${v.stock} in stock)` : ""}
                            </option>
                          ))}
                        </select>
                      ) : (
                        row.stock != null && <div className="muted" style={{ fontSize: 11 }}>{row.stock.toLocaleString()} in stock</div>
                      )}
                    </div>
                  )}
                  {row.status === "not-found" && <span style={{ color: "var(--danger)", fontWeight: 600 }}>SKU not found</span>}
                  {row.status === "idle" && <span className="muted">—</span>}
                </div>
                <span className="mono" style={{ textAlign: "right", fontWeight: 600, fontSize: 12 }}>
                  {row.unitPrice != null ? fmt(row.unitPrice) : <span className="muted">—</span>}
                </span>
                <button type="button" onClick={() => setRows((p) => p.filter((r) => r.id !== row.id))} className="btn btn-ghost btn-xs" style={{ width: 28, height: 28, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="x" size={12} />
                </button>
              </div>
            ))}
            </div>

            <div style={{ padding: "10px 16px", borderTop: "1px solid var(--line)" }}>
              <button type="button" onClick={addRow} className="btn btn-ghost btn-sm">
                <Icon name="plus" size={14} />
                Add row
              </button>
            </div>
          </div>
          </div>

          {/* Mobile entry — strip-style block: search typeahead → resolved
              rows → subtotal → CTAs. Lives outside `.card` so the dropdown
              can overflow the container; only shown ≤768px. */}
          <div className="qo-entry-mobile" style={{ marginBottom: 16 }}>
            <div className="qow-inner">
              {/* Header strip */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Enter SKUs</h3>
                {mobileResolvedRows.length > 0 && (
                  <button type="button" className="qow-clear" onClick={clearAll}>Clear</button>
                )}
              </div>

              {/* Algolia typeahead */}
              <div className="qow-search-wrap">
                <div className="qow-search-box">
                  <Icon name="search" size={15} style={{ color: "var(--muted-2)", flexShrink: 0 }} />
                  <input
                    ref={mobileSearchRef}
                    className="qow-search-input"
                    type="text"
                    value={mobileQuery}
                    onChange={(e) => setMobileQuery(e.target.value)}
                    onFocus={() => { if (mobileResults.length) setShowMobileDropdown(true); }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { setShowMobileDropdown(false); setMobileQuery(""); }
                      if (e.key === "Enter" && mobileResults.length > 0) addFromAlgolia(mobileResults[0]);
                    }}
                    placeholder="Type or paste SKU…"
                    autoComplete="off"
                  />
                </div>
                {showMobileDropdown && mobileResults.length > 0 && (
                  <div ref={mobileDropdownRef} className="qow-dropdown">
                    {mobileResults.map((hit) => (
                      <button
                        key={hit.objectID}
                        type="button"
                        className="qow-result-row"
                        onMouseDown={(e) => { e.preventDefault(); addFromAlgolia(hit); }}
                      >
                        <span className="qow-result-info">
                          <span className="qow-result-name">{hit.name}</span>
                          <span className="qow-result-meta">{hit.sku}{hit.brand ? ` · ${hit.brand}` : ""}{hit.stockQty != null ? ` · ${hit.stockQty.toLocaleString()} in stock` : ""}</span>
                        </span>
                        {hit.price != null && <span className="qow-result-price">${hit.price.toFixed(2)}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats */}
              {mobileResolvedRows.length > 0 && (
                <div className="qow-stats">
                  <span className="qow-stats-label">{readyRowsValid.length} SKU{readyRowsValid.length !== 1 ? "s" : ""} · {readyRowsValid.reduce((s, r) => s + (parseInt(r.qty, 10) || 0), 0)} unit{readyRowsValid.reduce((s, r) => s + (parseInt(r.qty, 10) || 0), 0) !== 1 ? "s" : ""}</span>
                </div>
              )}

              {/* Resolved rows */}
              {mobileResolvedRows.length > 0 && (
                <div className="qow-rows">
                  {mobileResolvedRows.map((row) => {
                    const qtyNum = parseInt(row.qty, 10) || 0;
                    return (
                      <div key={row.id} className="qow-row">
                        <div className="qow-row-top">
                          <span className="qow-thumb" aria-hidden="true">{brandInitials(row.name?.split(" ")[0])}</span>
                          <div className="qow-row-info">
                            {row.stock != null && (
                              <span className="qow-row-brand">{row.stock.toLocaleString()} in stock</span>
                            )}
                            <span className="qow-row-name">{rowDisplayName(row)}</span>
                            <span className="qow-row-sku">{row.selectedVariantSku ?? row.sku}</span>
                            {row.variants && row.variants.length > 0 && (
                              <select
                                className="select"
                                style={{ marginTop: 6, width: "100%" }}
                                value={row.selectedVariantId ?? ""}
                                onChange={(e) => handleVariantChange(row.id, e.target.value)}
                              >
                                <option value="" disabled>Select {row.variants[0].optionName}…</option>
                                {row.variants.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.label}{v.stock != null ? ` (${v.stock} in stock)` : ""}
                                  </option>
                                ))}
                              </select>
                            )}
                            {row.status === "loading" && <span className="muted" style={{ fontSize: 12 }}>Looking up…</span>}
                            {row.status === "not-found" && <span style={{ color: "var(--danger)", fontSize: 12, fontWeight: 600 }}>SKU not found</span>}
                          </div>
                          <button
                            type="button"
                            className="qow-remove"
                            onClick={() => removeRow(row.id)}
                            aria-label="Remove"
                          >
                            <Icon name="x" size={14} />
                          </button>
                        </div>
                        <div className="qow-row-bottom">
                          <div className="qow-qty">
                            <button type="button" aria-label="Decrease" onClick={() => handleQtyChange(row.id, String(Math.max(1, qtyNum - 1)))}>−</button>
                            <input
                              type="number" min={1} inputMode="numeric" value={row.qty} aria-label="Quantity"
                              onChange={(e) => handleQtyChange(row.id, e.target.value)}
                              onBlur={(e) => { if (!e.target.value || parseInt(e.target.value, 10) < 1) handleQtyChange(row.id, "1"); }}
                            />
                            <button type="button" aria-label="Increase" onClick={() => handleQtyChange(row.id, String(qtyNum + 1))}>+</button>
                          </div>
                          <div className="qow-row-price">
                            {row.unitPrice != null && row.unitPrice > 0 && (
                              <span className="qow-unit-price">{fmt(row.unitPrice)}/EA</span>
                            )}
                            <span className="qow-line-total">
                              {row.unitPrice != null ? fmt(row.unitPrice * qtyNum) : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Subtotal */}
              {mobileResolvedRows.length > 0 && (
                <div className="qow-subtotal">
                  <span className="qow-subtotal-label">Subtotal · {readyRowsValid.length} SKU{readyRowsValid.length !== 1 ? "s" : ""}</span>
                  <span className="qow-subtotal-value">{fmt(subtotal)}</span>
                </div>
              )}

              {/* CTAs */}
              <div className="qow-add-all" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {canPlaceOrders ? (
                  <button
                    type="button"
                    className="btn btn-lg btn-block"
                    onClick={handleAddToCart}
                    disabled={!readyRowsValid.length || cartLoading}
                    style={{ width: "100%", opacity: !readyRowsValid.length ? 0.4 : 1, cursor: !readyRowsValid.length ? "not-allowed" : "pointer" }}
                  >
                    <Icon name="cart" size={16} />
                    {cartLoading ? "Adding…" : `Add ${readyRowsValid.length || ""} item${readyRowsValid.length !== 1 ? "s" : ""} to cart`}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-lg btn-block"
                    onClick={handleAddToQuote}
                    disabled={!readyRowsValid.length || quoteLoading}
                    style={{ width: "100%", opacity: !readyRowsValid.length ? 0.4 : 1, cursor: !readyRowsValid.length ? "not-allowed" : "pointer" }}
                  >
                    <Icon name="quote" size={16} />
                    {quoteLoading ? "Adding…" : `Add ${readyRowsValid.length || ""} item${readyRowsValid.length !== 1 ? "s" : ""} to quote`}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={canPlaceOrders ? handleAddToQuote : handleAddToCart}
                  disabled={!readyRowsValid.length || (canPlaceOrders ? quoteLoading : cartLoading)}
                  style={{ width: "100%", opacity: !readyRowsValid.length ? 0.4 : 1, cursor: !readyRowsValid.length ? "not-allowed" : "pointer" }}
                >
                  {canPlaceOrders ? (quoteLoading ? "Adding…" : "Add to quote") : (cartLoading ? "Adding…" : "Add to cart")}
                </button>
              </div>

              {cartError && <p className="qow-cart-error">{cartError}</p>}
              {quoteSuccess && <p style={{ color: "var(--success)", fontSize: 12, margin: "0 16px 14px" }}>Added to quote successfully.</p>}
            </div>
          </div>

          {/* Paste from spreadsheet */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-h">
              <h3>Paste from spreadsheet</h3>
              <span className="muted" style={{ fontSize: 12 }}>SKU in col A, qty in col B · tab or comma separated</span>
            </div>
            <div className="card-b">
              <textarea
                className="textarea mono"
                style={{ minHeight: 120, fontFamily: "var(--font-geist-mono, monospace)", fontSize: 12, lineHeight: 1.8 }}
                placeholder={`LH-2X4-40LM-35K\t24\nCR-HB-200W-50K\t8`}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={parsePasteLines} disabled={!pasteText.trim()}>
                <Icon name="arrow" size={13} />
                Parse &amp; load
              </button>
            </div>
          </div>

          {/* File upload */}
          <div className="card">
            <div className="card-h">
              <h3>Upload order file</h3>
              <span className="muted" style={{ fontSize: 12 }}>CSV or TXT · SKU in col A, qty in col B</span>
            </div>
            <div className="card-b">
              <label style={{ display: "block", border: "2px dashed var(--line)", borderRadius: "var(--radius-card)", padding: "24px", textAlign: "center", cursor: "pointer", color: "var(--muted)", fontSize: 13 }}>
                <input
                  type="file"
                  accept=".csv,.txt"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
                <Icon name="upload" size={20} style={{ display: "block", margin: "0 auto 8px" }} />
                Click to upload or drag and drop a CSV file
              </label>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ position: "sticky", top: 80 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>Order summary</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted">Items ready</span>
                <span className="mono">{readyRowsValid.length}</span>
              </div>
              {savings > 0.005 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--success)" }}>
                  <span>Savings</span>
                  <span className="mono">−{fmt(savings)}</span>
                </div>
              )}
              <hr className="divider" style={{ margin: "4px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 700 }}>Subtotal</span>
                <span className="mono" style={{ fontSize: 20, fontWeight: 700 }}>{fmt(subtotal)}</span>
              </div>
            </div>

            {hasUnselectedVariants && (
              <p style={{ fontSize: 11, color: "var(--warn)", margin: "0 0 14px", lineHeight: 1.4 }}>
                Select a variant for all products before adding to cart or quote.
              </p>
            )}

            {canPlaceOrders ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!readyRowsValid.length || cartLoading}
                  className="btn btn-lg btn-block"
                  style={{ opacity: !readyRowsValid.length ? 0.45 : 1, cursor: !readyRowsValid.length ? "not-allowed" : "pointer" }}
                >
                  <Icon name="cart" size={14} />
                  {cartLoading ? "Adding…" : `Add ${readyRowsValid.length || ""} item${readyRowsValid.length !== 1 ? "s" : ""} to cart`}
                </button>
                <button
                  type="button"
                  onClick={handleAddToQuote}
                  disabled={!readyRowsValid.length || quoteLoading}
                  className="btn btn-ghost btn-lg btn-block"
                  style={{ opacity: !readyRowsValid.length ? 0.45 : 1, cursor: !readyRowsValid.length ? "not-allowed" : "pointer" }}
                >
                  <Icon name="quote" size={14} />
                  {quoteLoading ? "Adding…" : "Add to quote"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  onClick={handleAddToQuote}
                  disabled={!readyRowsValid.length || quoteLoading}
                  className="btn btn-lg btn-block"
                  style={{ opacity: !readyRowsValid.length ? 0.45 : 1, cursor: !readyRowsValid.length ? "not-allowed" : "pointer" }}
                >
                  <Icon name="quote" size={14} />
                  {quoteLoading ? "Adding…" : `Add ${readyRowsValid.length || ""} item${readyRowsValid.length !== 1 ? "s" : ""} to quote`}
                </button>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!readyRowsValid.length || cartLoading}
                  className="btn btn-ghost btn-lg btn-block"
                  style={{ opacity: !readyRowsValid.length ? 0.45 : 1, cursor: !readyRowsValid.length ? "not-allowed" : "pointer" }}
                >
                  <Icon name="cart" size={14} />
                  {cartLoading ? "Adding…" : "Add to cart"}
                </button>
              </div>
            )}

            {cartError && (
              <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 10, marginBottom: 0 }}>{cartError}</p>
            )}
            {quoteSuccess && (
              <p style={{ color: "var(--success)", fontSize: 12, marginTop: 10, marginBottom: 0 }}>Added to quote successfully.</p>
            )}
          </div>

          <div className="card" style={{ padding: 20, marginTop: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px" }}>Tips</h3>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.7 }}>
              <li>Press <kbd style={{ padding: "1px 5px", border: "1px solid var(--line-2)", borderRadius: 3, fontSize: 11 }}>↵</kbd> to jump to the next row</li>
              <li>Paste a spreadsheet column using the panel below</li>
              <li>Upload a CSV with SKU and quantity columns</li>
              <li>Prices update automatically on SKU lookup</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
