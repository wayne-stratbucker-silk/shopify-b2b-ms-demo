"use client";

import { useState, useCallback, useRef, useEffect, KeyboardEvent } from "react";
import Link from "next/link";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput } from "@makeswift/runtime/controls";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";
import { normalizeHit, type RawConnectorHit } from "@/lib/algolia/connector-hit";
import { formatLineName, type NameOptionPair } from "@/lib/format-line-name";
import type { QuickOrderRow, VariantOption } from "@/types/line-item";

// ─── Algolia ──────────────────────────────────────────────────────────────────

const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
const INDEX = "catalyst B2B demo";
const HAS_ALGOLIA = Boolean(APP_ID && SEARCH_KEY);

// Lazy-load `algoliasearch/lite` so it stays out of the shared bundle (this
// component is registered at the root layout). The ~50KB client only ships as
// a separate async chunk the first time a buyer searches the mobile box, which
// keeps it off the critical path on every page. Mirrors the dynamic-import
// pattern in components/search/search-box.tsx.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let clientPromise: Promise<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSearchClient(): Promise<any> | null {
  if (!HAS_ALGOLIA) return null;
  if (!clientPromise) {
    clientPromise = import("algoliasearch/lite").then(({ liteClient }) =>
      liteClient(APP_ID!, SEARCH_KEY!),
    );
  }
  return clientPromise;
}

interface AlgoliaHit {
  objectID: string;
  sku: string;
  name: string;
  price?: number;
  stockQty?: number;
  brand?: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────
//
// `QuickOrderRow` lives in `@/types/line-item` (canonical line-item set).
// We extend it locally with a non-empty `sku` field — the canonical type
// keeps every LineItem field optional because rows can start in an "idle"
// state where the buyer hasn't typed a SKU yet.

type OrderRow = QuickOrderRow & { sku: string };

const COL = "1.6fr 2fr 100px 100px 100px 36px";

// ─── Avatar helpers ───────────────────────────────────────────────────────────
// Only `brandInitials` is still in use — the square `.qow-thumb` placeholder on
// resolved mobile rows. The dropdown rows no longer show an avatar.

function brandInitials(brand?: string): string {
  if (!brand) return "–";
  const words = brand.trim().split(/\s+/);
  return words.length === 1 ? words[0].slice(0, 2).toUpperCase() : (words[0][0] + words[1][0]).toUpperCase();
}

function parseClipboardSkus(text: string): string[] {
  return text
    .split(/[\n\r,\t ]+/)
    .map((s) => s.trim())
    .filter((s) => /^[A-Z0-9][A-Z0-9\-_]{1,40}$/i.test(s) && s.length >= 3);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newRow(): OrderRow {
  return { id: Math.random().toString(36).slice(2), sku: "", quantity: 1, status: "idle" };
}

// Name + selected-variant suffix for a resolved row (e.g. "Cable (Length: 50 ft)").
// Returns the bare name when the row has no variants or none is selected yet.
function rowDisplayName(row: OrderRow): string {
  const name = row.name ?? row.sku;
  if (!row.variants?.length || row.selectedVariantId == null) return name;
  const v = row.variants.find((vv) => vv.id === row.selectedVariantId);
  if (!v) return name;
  const pairs: NameOptionPair[] = [{ name: v.optionName, value: v.label }];
  return formatLineName(name, pairs);
}

// ─── Main component ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function QuickOrderStrip(props: any) {
  const { heading, subheading, ctaLabel, className } = props as {
    heading?: string;
    subheading?: string;
    ctaLabel?: string;
    className?: string;
  };

  const { toast } = useToast();

  // ── Shared state ──
  const [rows, setRows] = useState<OrderRow[]>([newRow(), newRow(), newRow()]);
  const [cartLoading, setCartLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [cartError, setCartError] = useState("");

  // Permissions: users without company.orders.create lead with Add to Quote
  const [session, setSession] = useState<{ b2bCompanyId?: number; permissions?: string[] } | null>(null);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.user) setSession(d.user); })
      .catch(() => {});
  }, []);
  const canPlaceOrders = !session?.b2bCompanyId
    || session?.permissions?.includes("company.orders.create") === true;
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Mobile / Algolia state ──
  const [mobileQuery, setMobileQuery] = useState("");
  const [mobileResults, setMobileResults] = useState<AlgoliaHit[]>([]);
  const [showMobileDropdown, setShowMobileDropdown] = useState(false);
  const [clipboardSkus, setClipboardSkus] = useState<string[]>([]);
  const [pasteLoading, setPasteLoading] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const mobileDropdownRef = useRef<HTMLDivElement>(null);
  const mobileDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Desktop: SKU lookup ───────────────────────────────────────────────────

  const lookupSku = useCallback(async (rowId: string, sku: string) => {
    if (!sku.trim()) {
      setRows((prev) => prev.map((r) =>
        r.id === rowId
          ? { ...r, status: "idle", name: undefined, stock: undefined, unitPrice: undefined, listPrice: undefined, variants: undefined, selectedVariantId: undefined }
          : r
      ));
      return;
    }
    setRows((prev) => prev.map((r) => r.id === rowId ? { ...r, status: "loading" } : r));
    try {
      const res = await fetch(`/api/bc/products?skus=${encodeURIComponent(sku.trim())}`);
      const data = await res.json() as {
        products?: Array<{
          sku: string; name: string;
          unitPriceRaw?: number; listPriceRaw?: number; stock?: number;
          variants?: VariantOption[];
          productId?: number;
        }>
      };
      const match = data.products?.[0];
      if (match) {
        const firstVariant = match.variants?.[0];
        setRows((prev) => prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                status: "found",
                name: match.name,
                stock: match.stock,
                unitPrice: firstVariant?.price ?? match.unitPriceRaw,
                listPrice: match.listPriceRaw,
                variants: match.variants,
                selectedVariantId: firstVariant?.id,
                selectedVariantSku: firstVariant?.sku,
                selectedVariantPrice: firstVariant?.price,
                productId: match.productId,
              }
            : r
        ));
      } else {
        setRows((prev) => prev.map((r) =>
          r.id === rowId
            ? { ...r, status: "not-found", name: undefined, stock: undefined, unitPrice: undefined, listPrice: undefined, variants: undefined }
            : r
        ));
      }
    } catch {
      setRows((prev) => prev.map((r) => r.id === rowId ? { ...r, status: "not-found" } : r));
    }
  }, []);

  function handleSkuChange(rowId: string, value: string) {
    setRows((prev) => prev.map((r) =>
      r.id === rowId
        ? { ...r, sku: value, status: "idle", name: undefined, stock: undefined, unitPrice: undefined, listPrice: undefined, variants: undefined, selectedVariantId: undefined }
        : r
    ));
    clearTimeout(debounceTimers.current[rowId]);
    debounceTimers.current[rowId] = setTimeout(() => lookupSku(rowId, value), 400);
  }

  function handleSkuBlur(rowId: string, sku: string) {
    clearTimeout(debounceTimers.current[rowId]);
    lookupSku(rowId, sku);
  }

  function handleSkuKeyDown(e: KeyboardEvent<HTMLInputElement>, rowId: string, rowIndex: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (rowIndex === rows.length - 1) addRow();
      const inputs = document.querySelectorAll<HTMLInputElement>(".qo-sku-input");
      inputs[rowIndex + 1]?.focus();
    }
  }

  function handleQtyChange(rowId: string, value: string) {
    const quantity = Math.max(1, parseInt(value, 10) || 1);
    setRows((prev) => prev.map((r) => r.id === rowId ? { ...r, quantity } : r));
  }

  function handleVariantChange(rowId: string, variantId: number) {
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

  function removeRow(rowId: string) {
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  }

  function addRow() {
    setRows((prev) => [...prev, newRow()]);
  }

  function clearAll() {
    setRows([newRow(), newRow(), newRow()]);
    setCartError("");
  }

  // ── Mobile: Algolia search ────────────────────────────────────────────────

  const checkClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const skus = parseClipboardSkus(text);
      setClipboardSkus(skus.length >= 1 ? skus : []);
    } catch { /* permission denied */ }
  }, []);

  useEffect(() => {
    checkClipboard();
  }, [checkClipboard]);

  useEffect(() => {
    clearTimeout(mobileDebounceRef.current);
    if (!mobileQuery.trim() || !HAS_ALGOLIA) {
      setMobileResults([]);
      setShowMobileDropdown(false);
      return;
    }
    mobileDebounceRef.current = setTimeout(async () => {
      try {
        const client = await getSearchClient();
        if (!client) return;
        const response = await client.search({
          requests: [{ indexName: INDEX, query: mobileQuery.trim(), hitsPerPage: 6 }],
        });
        const raw: RawConnectorHit[] = response.results?.[0]?.hits ?? [];
        // Normalize connector fields (brand_name/calculated_prices/inventory)
        // into the price/stockQty/brand the row reads.
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
    setRows((prev) => {
      const exists = prev.find((r) => r.sku === hit.sku && r.status === "found");
      if (exists) {
        return prev.map((r) =>
          r.sku === hit.sku && r.status === "found" ? { ...r, quantity: (r.quantity ?? 1) + 1 } : r
        );
      }
      // Replace first empty idle row, or append
      const emptyIdx = prev.findIndex((r) => r.status === "idle" && !r.sku);
      const newRowEntry: OrderRow = {
        id: Math.random().toString(36).slice(2),
        sku: hit.sku,
        quantity: 1,
        name: hit.name,
        brand: hit.brand,
        stock: hit.stockQty,
        unitPrice: hit.price,
        status: "found",
      };
      if (emptyIdx >= 0) {
        const next = [...prev];
        next[emptyIdx] = newRowEntry;
        return next;
      }
      return [...prev, newRowEntry];
    });
    setMobileQuery("");
    setMobileResults([]);
    setShowMobileDropdown(false);
    mobileSearchRef.current?.focus();
  }

  async function pasteFromClipboard() {
    if (!clipboardSkus.length) return;
    setPasteLoading(true);
    try {
      const res = await fetch(`/api/bc/products?skus=${encodeURIComponent(clipboardSkus.join(","))}`);
      const data = await res.json() as {
        products?: Array<{ sku: string; name: string; brand?: string; stock?: number; unitPriceRaw?: number; listPriceRaw?: number }>
      };
      setRows((prev) => {
        const merged = [...prev];
        for (const p of data.products ?? []) {
          if (merged.find((r) => r.sku === p.sku && r.status === "found")) continue;
          const emptyIdx = merged.findIndex((r) => r.status === "idle" && !r.sku);
          const entry: OrderRow = {
            id: Math.random().toString(36).slice(2),
            sku: p.sku,
            quantity: 1,
            name: p.name,
            brand: p.brand,
            stock: p.stock,
            unitPrice: p.unitPriceRaw,
            listPrice: p.listPriceRaw,
            status: "found",
          };
          if (emptyIdx >= 0) merged[emptyIdx] = entry;
          else merged.push(entry);
        }
        return merged;
      });
      setClipboardSkus([]);
    } catch { /* silently fail */ }
    finally { setPasteLoading(false); }
  }

  // ── Computed totals ───────────────────────────────────────────────────────

  const readyRows = rows.filter((r) => r.status === "found");
  const readyRowsValid = readyRows.filter((r) => !r.variants?.length || r.selectedVariantId != null);
  const total = readyRowsValid.reduce((s, r) => s + (r.unitPrice ?? 0) * (r.quantity ?? 1), 0);
  const listTotal = readyRowsValid.reduce((s, r) => s + (r.listPrice ?? r.unitPrice ?? 0) * (r.quantity ?? 1), 0);
  const savings = listTotal - total;
  const emptyCount = rows.length - readyRows.length;
  const totalUnits = readyRowsValid.reduce((s, r) => s + (r.quantity ?? 1), 0);

  // ── Add to cart ───────────────────────────────────────────────────────────

  // Collapse duplicate SKUs (sum quantity) into { sku, quantity } line items.
  function collectItems(): Array<{ sku: string; quantity: number }> {
    const totals = new Map<string, number>();
    for (const r of readyRowsValid) {
      const sku = (r.selectedVariantSku ?? r.sku).trim();
      if (!sku) continue;
      totals.set(sku, (totals.get(sku) ?? 0) + (r.quantity ?? 1));
    }
    return [...totals.entries()].map(([sku, quantity]) => ({ sku, quantity }));
  }

  async function handleAddToCart() {
    if (!readyRowsValid.length || cartLoading) return;
    setCartLoading(true);
    setCartError("");
    try {
      const items = collectItems();
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json().catch(() => ({})) as { cartUrl?: string; error?: string };
      if (res.ok) {
        window.dispatchEvent(new Event("storage"));
        toast(`Added ${items.length} item${items.length === 1 ? "" : "s"} to your cart`, "success");
      } else {
        const msg = data.error ?? "Failed to add to cart. Please try again.";
        setCartError(msg);
        toast(msg, "error");
      }
    } catch {
      setCartError("Network error. Please try again.");
      toast("Network error. Please try again.", "error");
    } finally {
      setCartLoading(false);
    }
  }

  // Add to quote — the quote-cart endpoint is single-item only, so loop over
  // each valid row sequentially (collapsing duplicate SKUs), then toast a
  // combined result.
  async function handleAddToQuote() {
    if (!readyRowsValid.length || quoteLoading) return;
    setQuoteLoading(true);
    setCartError("");

    // Sum quantity per SKU, keeping product metadata from the first matching row.
    // The cookie-backed quote cart doesn't persist variant option pairs, so we
    // bake the suffixed display name in here — the review/FAB renderers stay
    // unchanged and naturally show "Name (Option: Value)".
    const bySku = new Map<string, { quantity: number; name?: string; price?: number; productId?: number }>();
    for (const r of readyRowsValid) {
      const sku = (r.selectedVariantSku ?? r.sku).trim();
      if (!sku) continue;
      const price = r.selectedVariantPrice ?? r.unitPrice ?? 0;
      const q = r.quantity ?? 1;
      const cur = bySku.get(sku);
      if (cur) cur.quantity += q;
      else bySku.set(sku, { quantity: q, name: rowDisplayName(r), price, productId: r.productId });
    }

    let ok = 0;
    let fail = 0;
    try {
      for (const [sku, info] of bySku.entries()) {
        try {
          const res = await fetch("/api/quotes/cart/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sku,
              quantity: info.quantity,
              name: info.name ?? sku,
              unitPrice: info.price ?? 0,
              productId: info.productId,
            }),
          });
          if (res.ok) ok++;
          else fail++;
        } catch {
          fail++;
        }
      }
      window.dispatchEvent(new Event("quoteCartUpdate"));
      if (ok > 0 && fail === 0) {
        toast(`Added ${ok} item${ok === 1 ? "" : "s"} to your quote`, "success");
      } else if (ok > 0) {
        toast(`Added ${ok} item${ok === 1 ? "" : "s"}; ${fail} failed`, "error");
      } else {
        toast("Could not add to quote. Please try again.", "error");
      }
    } finally {
      setQuoteLoading(false);
    }
  }

  // Add to list — POST SKUs+qty; the server resolves them, creates a B2B list,
  // and returns { id }. On success, redirect to the new list (matches the
  // Shoppable Diagram's onSaveAsList behavior).
  async function handleAddToList() {
    if (!readyRowsValid.length || listLoading) return;
    setListLoading(true);
    setCartError("");
    try {
      const items = collectItems();
      const res = await fetch("/api/b2b/lists/from-skus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json().catch(() => ({})) as { id?: number; error?: string };
      if (res.ok && data.id) {
        toast("List saved — opening it now…", "success");
        window.location.href = `/account/lists/${data.id}`;
      } else if (res.status === 401) {
        window.location.href = "/login";
      } else {
        toast(data.error ?? "Could not save list. Please try again.", "error");
      }
    } catch {
      toast("Could not save list. Please try again.", "error");
    } finally {
      setListLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className={className ?? ""}>
      <div className="container">
        {(heading || subheading) && (
          <div style={{ marginBottom: 20 }}>
            {heading && <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.015em", margin: "0 0 4px" }}>{heading}</h2>}
            {subheading && <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{subheading}</p>}
          </div>
        )}

        {/* ══════════════════════════════════════════
            DESKTOP layout (hidden on mobile via CSS)
        ══════════════════════════════════════════ */}
        <div className="qo-layout qo-desktop" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
          {/* Main pad */}
          <div className="card qo-card">
            <div className="card-h">
              <h3>Enter SKUs and quantities</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>Clear all</button>
            </div>

            {/* Column labels */}
            <div className="qo-col-headers" style={{
              display: "grid", gridTemplateColumns: COL,
              padding: "10px 16px", borderBottom: "1px solid var(--line)",
              fontSize: 11, fontWeight: 700, letterSpacing: ".04em",
              textTransform: "uppercase", color: "var(--muted)",
              background: "var(--surface-2)",
            }}>
              <span>SKU / MPN</span>
              <span>Product</span>
              <span style={{ textAlign: "right" }}>Unit</span>
              <span style={{ textAlign: "center" }}>Qty</span>
              <span style={{ textAlign: "right" }}>Subtotal</span>
              <span />
            </div>

            {/* Rows */}
            {rows.map((row, i) => {
              const effectivePrice = row.unitPrice ?? 0;
              return (
                <div
                  key={row.id}
                  className="qo-row-grid"
                  style={{
                    display: "grid", gridTemplateColumns: COL,
                    padding: "12px 16px",
                    borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : undefined,
                    fontSize: 13, alignItems: "center", gap: 0,
                  }}
                >
                  <input
                    className="input qo-sku-input"
                    type="text"
                    value={row.sku}
                    onChange={(e) => handleSkuChange(row.id, e.target.value)}
                    onBlur={(e) => handleSkuBlur(row.id, e.target.value)}
                    onKeyDown={(e) => handleSkuKeyDown(e, row.id, i)}
                    placeholder="Type or paste SKU…"
                    style={{ height: 32, fontSize: 12, fontFamily: "var(--font-geist-mono, monospace)", maxWidth: 180 }}
                  />

                  <div style={{ paddingLeft: 12, minWidth: 0 }}>
                    {row.status === "loading" && <span className="muted" style={{ fontSize: 12 }}>Looking up…</span>}
                    {row.status === "found" && (
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {rowDisplayName(row)}
                        </div>
                        {row.variants && row.variants.length > 0 ? (
                          <select
                            className="select"
                            style={{ marginTop: 4, height: 26, fontSize: 11, width: "100%", maxWidth: 200 }}
                            value={row.selectedVariantId ?? ""}
                            onChange={(e) => handleVariantChange(row.id, Number(e.target.value))}
                          >
                            <option value="" disabled>Select {row.variants[0].optionName}…</option>
                            {row.variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label}{v.stock != null ? ` (${v.stock} in stock)` : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="mono muted" style={{ fontSize: 10, marginTop: 2 }}>
                            {row.stock != null ? `${row.stock.toLocaleString()} in stock` : ""}
                          </div>
                        )}
                      </div>
                    )}
                    {row.status === "not-found" && <span style={{ color: "var(--danger)", fontSize: 12, fontWeight: 600 }}>SKU not found</span>}
                    {(row.status === "idle" || (!row.sku && row.status !== "loading")) && <span className="muted" style={{ fontSize: 12 }}>—</span>}
                  </div>

                  <span className="mono" style={{ textAlign: "right", fontSize: 12, fontWeight: 600, paddingRight: 8 }}>
                    {effectivePrice > 0 ? `$${effectivePrice.toFixed(2)}` : "—"}
                  </span>

                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {row.status === "found" ? (
                      <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--line-2)", borderRadius: "var(--radius)", overflow: "hidden", height: 30 }}>
                        <button type="button" onClick={() => handleQtyChange(row.id, String((row.quantity ?? 1) - 1))} style={{ width: 26, height: "100%", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--ink-2)", flexShrink: 0 }}>−</button>
                        <input
                          className="qty-input"
                          type="number" min={1} value={(row.quantity ?? 1)}
                          onChange={(e) => handleQtyChange(row.id, e.target.value)}
                          onFocus={(e) => { e.target.value = ""; }}
                          onBlur={(e) => { if (!e.target.value || parseInt(e.target.value, 10) < 1) handleQtyChange(row.id, "1"); }}
                          style={{ width: 36, height: "100%", border: "none", textAlign: "center", fontSize: 12, fontFamily: "var(--font-geist-mono, monospace)", outline: "none", color: "var(--ink)" }}
                        />
                        <button type="button" onClick={() => handleQtyChange(row.id, String((row.quantity ?? 1) + 1))} style={{ width: 26, height: "100%", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--ink-2)", flexShrink: 0 }}>+</button>
                      </div>
                    ) : <span className="muted">—</span>}
                  </div>

                  <span className="mono" style={{ textAlign: "right", fontSize: 13, fontWeight: 700, paddingRight: 8 }}>
                    {effectivePrice > 0 ? `$${(effectivePrice * (row.quantity ?? 1)).toFixed(2)}` : "—"}
                  </span>

                  <button type="button" onClick={() => removeRow(row.id)} className="btn btn-ghost btn-sm" style={{ width: 28, height: 28, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                    ×
                  </button>
                </div>
              );
            })}

            <div style={{ padding: "10px 16px", borderTop: "1px solid var(--line)" }}>
              <button type="button" onClick={addRow} className="btn btn-ghost btn-sm">+ Add row</button>
            </div>

            <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--surface-2)", borderTop: "1px solid var(--line)", fontSize: 13 }}>
              <span className="muted">{readyRows.length} resolved · {emptyCount} empty</span>
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="muted">Subtotal</span>
                <span className="mono" style={{ fontSize: 18, fontWeight: 700 }}>${total.toFixed(2)}</span>
              </span>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ position: "sticky", top: 80 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px", letterSpacing: "-.01em" }}>Order summary</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted">List subtotal</span>
                  <span className="mono">${listTotal.toFixed(2)}</span>
                </div>
                {savings > 0.005 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--success)" }}>
                    <span>Savings</span>
                    <span className="mono">−${savings.toFixed(2)}</span>
                  </div>
                )}
                <hr className="divider" style={{ margin: "6px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 700 }}>Subtotal</span>
                  <span className="mono" style={{ fontSize: 22, fontWeight: 700 }}>${total.toFixed(2)}</span>
                </div>
              </div>

              {readyRows.length > 0 && readyRows.length !== readyRowsValid.length && (
                <p style={{ fontSize: 11, color: "var(--warn)", margin: "12px 0 0", lineHeight: 1.4 }}>
                  Select a variant for all products before adding to cart.
                </p>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
                {/* Primary CTA swaps based on role — buyers lead with quote */}
                {canPlaceOrders ? (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!readyRowsValid.length || cartLoading}
                    className="btn btn-lg btn-block"
                    style={{ width: "100%", opacity: !readyRowsValid.length ? 0.45 : 1, cursor: !readyRowsValid.length ? "not-allowed" : "pointer" }}
                  >
                    <Icon name="cart" size={16} />
                    {cartLoading ? "Adding…" : (ctaLabel ?? `Add ${readyRowsValid.length || ""} item${readyRowsValid.length !== 1 ? "s" : ""} to cart`)}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddToQuote}
                    disabled={!readyRowsValid.length || quoteLoading}
                    className="btn btn-lg btn-block"
                    style={{ width: "100%", opacity: !readyRowsValid.length ? 0.45 : 1, cursor: !readyRowsValid.length ? "not-allowed" : "pointer" }}
                  >
                    <Icon name="quote" size={16} />
                    {quoteLoading ? "Adding…" : `Add ${readyRowsValid.length || ""} item${readyRowsValid.length !== 1 ? "s" : ""} to quote`}
                  </button>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {canPlaceOrders ? (
                    <button
                      type="button"
                      onClick={handleAddToQuote}
                      disabled={!readyRowsValid.length || quoteLoading}
                      className="btn btn-ghost"
                      style={{ width: "100%", opacity: !readyRowsValid.length ? 0.45 : 1, cursor: !readyRowsValid.length ? "not-allowed" : "pointer" }}
                    >
                      <Icon name="quote" size={15} />
                      {quoteLoading ? "Adding…" : "Add to quote"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={!readyRowsValid.length || cartLoading}
                      className="btn btn-ghost"
                      style={{ width: "100%", opacity: !readyRowsValid.length ? 0.45 : 1, cursor: !readyRowsValid.length ? "not-allowed" : "pointer" }}
                    >
                      <Icon name="cart" size={15} />
                      {cartLoading ? "Adding…" : "Add to cart"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAddToList}
                    disabled={!readyRowsValid.length || listLoading}
                    className="btn btn-ghost"
                    style={{ width: "100%", opacity: !readyRowsValid.length ? 0.45 : 1, cursor: !readyRowsValid.length ? "not-allowed" : "pointer" }}
                  >
                    <Icon name="list" size={15} />
                    {listLoading ? "Saving…" : "Add to list"}
                  </button>
                </div>
              </div>

              {cartError && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 10, marginBottom: 0 }}>{cartError}</p>}
            </div>

            <div className="card" style={{ padding: 20, marginTop: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 10px" }}>Power user tips</h3>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.7 }}>
                <li>Press <kbd style={{ padding: "1px 5px", border: "1px solid var(--line-2)", borderRadius: 3, fontFamily: "inherit", fontSize: 11 }}>Tab</kbd> to jump between SKU and Qty</li>
                <li>Press <kbd style={{ padding: "1px 5px", border: "1px solid var(--line-2)", borderRadius: 3, fontFamily: "inherit", fontSize: 11 }}>↵</kbd> to add another row</li>
                <li>Paste a column of SKUs — quantities default to 1</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            MOBILE layout (hidden on desktop via CSS)
            Just the white action card (search/paste/rows/subtotal/add-all)
            with a separate "Open full Quick Order" link below it. The outer
            tinted "Power User Shortcut" wrapper was removed by request.
        ══════════════════════════════════════════ */}
        <div className="qo-mobile">
          <div className="qow-shell">
            {/* White action card */}
            <div className="qow-inner">
                {/* Algolia search */}
                <div className="qow-search-wrap">
                  <div className="qow-search-box">
                    <Icon name="search" size={15} style={{ color: "var(--muted-2)", flexShrink: 0 }} />
                    <input
                      ref={mobileSearchRef}
                      className="qow-search-input"
                      type="text"
                      value={mobileQuery}
                      onChange={(e) => setMobileQuery(e.target.value)}
                      onFocus={() => { checkClipboard(); if (mobileResults.length) setShowMobileDropdown(true); }}
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

                {/* Clipboard paste */}
                {clipboardSkus.length > 0 && (
                  <button type="button" className="qow-paste-btn" onClick={pasteFromClipboard} disabled={pasteLoading}>
                    <Icon name="copy" size={14} style={{ color: "#3d5afe", flexShrink: 0 }} />
                    <span className="qow-paste-label">
                      Paste <strong>{clipboardSkus.length} SKU{clipboardSkus.length !== 1 ? "s" : ""}</strong>
                      {" "}<span style={{ color: "#3d5afe" }}>from your clipboard</span>
                    </span>
                    <Icon name="chevR" size={14} style={{ color: "var(--muted-2)", flexShrink: 0 }} />
                  </button>
                )}

                {/* Stats */}
                {readyRows.length > 0 && (
                  <div className="qow-stats">
                    <span className="qow-stats-label">{readyRows.length} SKU{readyRows.length !== 1 ? "s" : ""} · {totalUnits} unit{totalUnits !== 1 ? "s" : ""}</span>
                    <button type="button" className="qow-clear" onClick={clearAll}>Clear</button>
                  </div>
                )}

                {/* Order rows */}
                {readyRows.length > 0 && (
                  <div className="qow-rows">
                    {readyRows.map((row) => {
                      const price = row.unitPrice ?? 0;
                      return (
                        <div key={row.id} className="qow-row">
                          <div className="qow-row-top">
                            <span className="qow-thumb" aria-hidden="true">{brandInitials(row.brand)}</span>
                            <div className="qow-row-info">
                              <span className="qow-row-brand">{row.brand ?? ""}{row.stock != null ? ` · ${row.stock.toLocaleString()} in stock` : ""}</span>
                              <span className="qow-row-name">{rowDisplayName(row)}</span>
                              <span className="qow-row-sku">{row.selectedVariantSku ?? row.sku}</span>
                            </div>
                            <button type="button" className="qow-remove" onClick={() => removeRow(row.id)} aria-label="Remove">
                              <Icon name="x" size={14} />
                            </button>
                          </div>
                          <div className="qow-row-bottom">
                            <div className="qow-qty">
                              <button type="button" aria-label="Decrease" onClick={() => handleQtyChange(row.id, String((row.quantity ?? 1) - 1))}>−</button>
                              <input
                                type="number" min={1} value={(row.quantity ?? 1)} aria-label="Quantity"
                                onChange={(e) => handleQtyChange(row.id, e.target.value)}
                                onFocus={(e) => { e.target.value = ""; }}
                                onBlur={(e) => { if (!e.target.value || parseInt(e.target.value, 10) < 1) handleQtyChange(row.id, "1"); }}
                              />
                              <button type="button" aria-label="Increase" onClick={() => handleQtyChange(row.id, String((row.quantity ?? 1) + 1))}>+</button>
                            </div>
                            <div className="qow-row-price">
                              {price > 0 && <span className="qow-unit-price">${price.toFixed(2)}/EA</span>}
                              <span className="qow-line-total">${(price * (row.quantity ?? 1)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Subtotal + Add-all */}
                {readyRows.length > 0 && (
                  <div className="qow-subtotal">
                    <span className="qow-subtotal-label">Subtotal · {readyRows.length} SKU{readyRows.length !== 1 ? "s" : ""}</span>
                    <span className="qow-subtotal-value">${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="qow-add-all" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Primary CTA swaps based on role — buyers lead with quote */}
                  {canPlaceOrders ? (
                    <button
                      type="button"
                      className="btn btn-lg btn-block"
                      onClick={handleAddToCart}
                      disabled={!readyRowsValid.length || cartLoading}
                      style={{ width: "100%", opacity: !readyRowsValid.length ? 0.4 : 1, cursor: !readyRowsValid.length ? "not-allowed" : "pointer" }}
                    >
                      <Icon name="cart" size={16} />
                      {cartLoading ? "Adding…" : (ctaLabel ?? "Add all to cart")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-lg btn-block"
                      onClick={handleAddToQuote}
                      disabled={!readyRowsValid.length || quoteLoading}
                      style={{ width: "100%", opacity: !readyRowsValid.length ? 0.4 : 1, cursor: !readyRowsValid.length ? "not-allowed" : "pointer" }}
                    >
                      {quoteLoading ? "Adding…" : "Add all to quote"}
                    </button>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {canPlaceOrders ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={handleAddToQuote}
                        disabled={!readyRowsValid.length || quoteLoading}
                        style={{ width: "100%", opacity: !readyRowsValid.length ? 0.4 : 1, cursor: !readyRowsValid.length ? "not-allowed" : "pointer" }}
                      >
                        {quoteLoading ? "Adding…" : "Add to quote"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={handleAddToCart}
                        disabled={!readyRowsValid.length || cartLoading}
                        style={{ width: "100%", opacity: !readyRowsValid.length ? 0.4 : 1, cursor: !readyRowsValid.length ? "not-allowed" : "pointer" }}
                      >
                        {cartLoading ? "Adding…" : "Add to cart"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={handleAddToList}
                      disabled={!readyRowsValid.length || listLoading}
                      style={{ width: "100%", opacity: !readyRowsValid.length ? 0.4 : 1, cursor: !readyRowsValid.length ? "not-allowed" : "pointer" }}
                    >
                      {listLoading ? "Saving…" : "Add to list"}
                    </button>
                  </div>
                </div>

                {cartError && <p className="qow-cart-error">{cartError}</p>}
            </div>

            {/* Open full Quick Order — separate card */}
            <Link href="/account/quick-order" className="qow-card-secondary" aria-label="Open full Quick Order">
              <Icon name="bolt" size={14} />
              <span>Open full Quick Order</span>
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}

runtime.registerComponent(QuickOrderStrip, {
  type: "acme-quick-order-strip",
  label: "Products & Ordering / Quick Order Strip",
  props: {
    className: Style(),
    heading: TextInput({ label: "Heading", defaultValue: "Quick Order by SKU" }),
    subheading: TextInput({ label: "Subheading", defaultValue: "Enter SKUs and quantities, then add them all to your cart at once" }),
    ctaLabel: TextInput({ label: "Button label (leave blank for auto)" }),
  },
});
