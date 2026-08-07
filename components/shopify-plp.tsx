"use client";

// Native-Shopify product listing (collection + search).
//
// Products AND facets are fetched server-side from the Storefront API (see
// lib/shopify/queries/plp.ts) and passed in as props. Faceting/sorting is
// URL-driven: selecting a facet pushes the facet value's opaque `input` JSON
// into the `filter` query param (repeatable); the server re-queries Shopify and
// this component re-renders with the new products/facets/counts. No search
// index, no client-side product fetching.

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { Icon } from "@/components/ui/icons";
import { trackViewItemList, toGa4Item } from "@/lib/analytics";
import type { PlpFacet, PlpSortKey } from "@/lib/shopify/queries/plp";
import type { Product } from "@/types";

interface ShopifyPlpProps {
  listName: string;
  mode: "collection" | "search";
  products: Product[];
  facets: PlpFacet[];
  totalCount?: number;
  sort: PlpSortKey;
  hiddenFacets?: string[];
  emptyTitle?: string;
  emptyHint?: string;
}

const COLLECTION_SORTS: Array<{ value: PlpSortKey; label: string }> = [
  { value: "best", label: "Best selling" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "title", label: "Name: A–Z" },
];
const SEARCH_SORTS: Array<{ value: PlpSortKey; label: string }> = [
  { value: "best", label: "Relevance" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

function parseInput(input: string): Record<string, unknown> | null {
  try { return JSON.parse(input) as Record<string, unknown>; } catch { return null; }
}
function isPriceInput(input: string): boolean {
  const p = parseInput(input);
  return !!p && typeof p === "object" && "price" in p;
}

function useCustomerSkuMap(): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    fetch("/api/account/customer-skus")
      .then((r) => r.json())
      .then((d: { skus?: Record<string, string> }) => { if (alive) setMap(d.skus ?? {}); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return map;
}

export function ShopifyPlp({
  listName,
  mode,
  products,
  facets,
  totalCount,
  sort,
  hiddenFacets = [],
  emptyTitle = "No products match your filters",
  emptyHint = "Try removing a filter to see more results.",
}: ShopifyPlpProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const customerSkuMap = useCustomerSkuMap();

  // Currently-applied facet inputs (opaque Shopify JSON strings) from the URL.
  const activeInputs = useMemo(() => searchParams.getAll("filter"), [searchParams]);
  const activePrice = useMemo(() => activeInputs.find(isPriceInput), [activeInputs]);
  const hasRefinements = activeInputs.length > 0;

  const shownFacets = facets.filter((f) => !hiddenFacets.includes(f.label));
  const sortOptions = mode === "search" ? SEARCH_SORTS : COLLECTION_SORTS;
  const count = totalCount ?? products.length;

  // Build a new URL preserving `q`, applying the given filter inputs + sort.
  function pushState(nextInputs: string[], nextSort: PlpSortKey) {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    if (nextSort && nextSort !== "best") params.set("sort", nextSort);
    for (const f of nextInputs) params.append("filter", f);
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function toggleInput(input: string) {
    const next = activeInputs.includes(input)
      ? activeInputs.filter((f) => f !== input)
      : [...activeInputs, input];
    pushState(next, sort);
  }
  function applyPrice(min: string, max: string) {
    const withoutPrice = activeInputs.filter((f) => !isPriceInput(f));
    const lo = min.trim() === "" ? undefined : Number(min);
    const hi = max.trim() === "" ? undefined : Number(max);
    if (lo === undefined && hi === undefined) { pushState(withoutPrice, sort); return; }
    const price: Record<string, number> = {};
    if (lo !== undefined && !Number.isNaN(lo)) price.min = lo;
    if (hi !== undefined && !Number.isNaN(hi)) price.max = hi;
    pushState([...withoutPrice, JSON.stringify({ price })], sort);
  }
  function clearAll() { pushState([], sort); }
  function changeSort(next: PlpSortKey) { pushState(activeInputs, next); }

  // Enrich cards with customer-specific SKUs (B2B) without a server round-trip.
  const displayed = useMemo(
    () => products.map((p) => {
      const customerSku = customerSkuMap[p.sku] ?? p.customerSku;
      return customerSku === p.customerSku ? p : { ...p, customerSku };
    }),
    [products, customerSkuMap],
  );

  useEffect(() => {
    if (displayed.length === 0) return;
    trackViewItemList(displayed.map((p, i) => toGa4Item(p, { index: i, listName })), listName);
  }, [displayed, listName]);

  useEffect(() => {
    document.body.style.overflow = filtersOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filtersOpen]);

  return (
    <div className="shop-shell">
      <div
        className={`mobile-filter-overlay${filtersOpen ? " open" : ""}`}
        onClick={() => setFiltersOpen(false)}
        aria-hidden="true"
      />

      {/* ─── SIDEBAR ─── */}
      <aside className={filtersOpen ? "filters-open" : ""}>
        <div className="filter-drawer-header">
          <span style={{ fontWeight: 600, fontSize: 13 }}>
            <Icon name="filter" size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
            Filters
          </span>
          <button className="btn btn-ghost btn-xs" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
            <Icon name="x" size={14} />
            Done
          </button>
        </div>

        <div className="filter-drawer-body">
          <div style={{ position: "sticky", top: 80 }}>
            <div className="filter-body-heading" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                <Icon name="filter" size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                Filters
              </span>
              {hasRefinements && (
                <button onClick={clearAll} style={{ fontSize: 11, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  Clear all
                </button>
              )}
            </div>

            {shownFacets.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--muted)" }}>No filters available.</p>
            )}

            {shownFacets.map((facet) =>
              facet.type === "PRICE_RANGE" ? (
                <PriceFacet
                  key={facet.id}
                  facet={facet}
                  activePrice={activePrice}
                  onApply={applyPrice}
                />
              ) : (
                <div className="facet" key={facet.id}>
                  <div className="facet-h">
                    {facet.label}
                    <Icon name="chev" size={14} style={{ color: "var(--muted)" }} />
                  </div>
                  <div className="facet-opts">
                    {facet.values.filter((v) => v.count > 0 || activeInputs.includes(v.input)).map((v) => (
                      <label key={v.id} className="facet-opt" style={{ cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          className="checkbox"
                          style={{ flexShrink: 0 }}
                          checked={activeInputs.includes(v.input)}
                          onChange={() => toggleInput(v.input)}
                        />
                        <span>{v.label}</span>
                        <span className="ct">{v.count.toLocaleString()}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ),
            )}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted-2, var(--muted))" }}>
              <Icon name="search" size={11} />
              Powered by Shopify
            </div>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <div>
        <div className="plp-toolbar">
          <button
            className="btn btn-ghost btn-sm show-mobile"
            onClick={() => setFiltersOpen(true)}
            style={{ gap: 6 }}
          >
            <Icon name="filter" size={14} />
            Filters
          </button>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            <strong style={{ color: "var(--ink)" }}>{count.toLocaleString()}</strong>{" "}
            product{count !== 1 ? "s" : ""}
          </span>
          <label style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
            Sort:
            <select
              className="select"
              style={{ width: "auto", height: 32, fontSize: 12 }}
              value={sort}
              onChange={(e) => changeSort(e.target.value as PlpSortKey)}
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        {displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 32px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-card)" }}>
            <Icon name="pkg" size={32} style={{ color: "var(--muted-2, var(--muted))", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>{emptyTitle}</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 20px" }}>
              {hasRefinements ? "Try removing a filter to see more results." : emptyHint}
            </p>
          </div>
        ) : (
          <div className="g4 plp-grid" style={{ gap: 20, opacity: isPending ? 0.6 : 1, transition: "opacity .15s" }}>
            {displayed.map((p, i) => (
              <ProductCard key={p.id} product={p} listName={listName} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PriceFacet({
  facet,
  activePrice,
  onApply,
}: {
  facet: PlpFacet;
  activePrice?: string;
  onApply: (min: string, max: string) => void;
}) {
  // Bounds advertised by Shopify's price facet value.
  const bounds = useMemo(() => {
    const v = facet.values[0]?.input ? parseInput(facet.values[0].input) : null;
    const price = (v?.price ?? {}) as { min?: number; max?: number };
    return { min: price.min ?? 0, max: price.max ?? 0 };
  }, [facet]);

  const applied = useMemo(() => (activePrice ? parseInput(activePrice) : null), [activePrice]);
  const appliedPrice = (applied?.price ?? {}) as { min?: number; max?: number };

  const [min, setMin] = useState(appliedPrice.min != null ? String(appliedPrice.min) : "");
  const [max, setMax] = useState(appliedPrice.max != null ? String(appliedPrice.max) : "");

  // Keep inputs in sync when the applied price changes elsewhere (e.g. Clear all).
  useEffect(() => {
    setMin(appliedPrice.min != null ? String(appliedPrice.min) : "");
    setMax(appliedPrice.max != null ? String(appliedPrice.max) : "");
  }, [appliedPrice.min, appliedPrice.max]);

  return (
    <div className="facet">
      <div className="facet-h">
        {facet.label}
        <Icon name="chev" size={14} style={{ color: "var(--muted)" }} />
      </div>
      <div className="facet-opts" style={{ gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="number"
            className="input"
            inputMode="decimal"
            placeholder={String(Math.floor(bounds.min))}
            value={min}
            min={0}
            onChange={(e) => setMin(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onApply(min, max); }}
            style={{ width: "50%", height: 32, fontSize: 12 }}
            aria-label="Minimum price"
          />
          <span style={{ color: "var(--muted)" }}>–</span>
          <input
            type="number"
            className="input"
            inputMode="decimal"
            placeholder={String(Math.ceil(bounds.max))}
            value={max}
            min={0}
            onChange={(e) => setMax(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onApply(min, max); }}
            style={{ width: "50%", height: 32, fontSize: 12 }}
            aria-label="Maximum price"
          />
        </div>
        <button className="btn btn-secondary btn-xs" onClick={() => onApply(min, max)} style={{ alignSelf: "flex-start" }}>
          Apply
        </button>
      </div>
    </div>
  );
}
