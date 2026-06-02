"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { liteClient } from "algoliasearch/lite";
import { ProductCard } from "@/components/product-card";
import { Icon } from "@/components/ui/icons";
import { trackViewItemList, toGa4Item } from "@/lib/analytics";
import {
  normalizeHit, filterByCollection, filterByBrand,
  applyLocalFacets, facetDefsFromResponse,
  type RawShopifyHit, type NormalizedHit, type FacetDef, type FacetSource,
} from "@/lib/algolia/connector-hit";
import { INDEX_PRODUCTS } from "@/lib/algolia/client";
import type { Product, BadgeKind } from "@/types";

const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
const client = APP_ID && SEARCH_KEY ? liteClient(APP_ID, SEARCH_KEY) : null;

type SortKey = "best" | "price-asc" | "price-desc" | "name";
type FacetMap = Record<string, Record<string, number>>;

export type PlpFilter =
  | { kind: "collection"; collectionHandle: string }
  | { kind: "brand"; brandName: string };

interface FacetedPlpProps {
  listName: string;
  filter: PlpFilter;
  initialProducts?: Product[];
  initialFacets?: FacetMap;
  initialFacetDefs?: FacetDef[];
  initialNbHits?: number;
  hiddenFacets?: string[];
  emptyTitle?: string;
  emptyHintInitial?: string;
  emptyHintRefined?: string;
}

function hitToProduct(hit: NormalizedHit): Product {
  return {
    id: hit.objectID,
    handle: hit.handle,
    sku: hit.sku ?? hit.handle,
    name: hit.name ?? hit.sku,
    brand: hit.brand ?? "",
    category: hit.category ?? "",
    price: hit.price,
    listPrice: hit.listPrice,
    wasSalePrice: hit.listPrice > hit.price ? hit.listPrice : undefined,
    uom: hit.uom ?? "EA",
    stockQty: hit.stockQty,
    trackInventory: hit.trackInventory,
    leadTime: hit.inStock || hit.totalInventory > 0 ? "In stock" : "Contact for availability",
    leadTimeDays: hit.inStock || hit.totalInventory > 0 ? 1 : undefined,
    badges: hit.badges.filter((b): b is BadgeKind =>
      ["new", "best", "bulk", "ship", "sale", "low"].includes(b)
    ),
    tiers: [{ minQty: 1, unitPrice: hit.price }],
    images: hit.imageUrl ? [hit.imageUrl] : undefined,
  };
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

export function FacetedPlp({
  listName,
  filter,
  initialProducts = [],
  initialFacets,
  initialFacetDefs,
  initialNbHits,
  hiddenFacets,
  emptyTitle = "No products match your filters",
  emptyHintInitial = "Try removing a filter to see more results.",
  emptyHintRefined = "Try removing a filter to see more results.",
}: FacetedPlpProps) {
  const customerSkuMap = useCustomerSkuMap();
  const [sort, setSort] = useState<SortKey>("best");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filterKind = filter.kind;
  const collectionHandle = filter.kind === "collection" ? filter.collectionHandle : undefined;
  const brandName = filter.kind === "brand" ? filter.brandName : undefined;
  const hiddenFacetsKey = (hiddenFacets ?? []).join(",");

  const seededFromServer = (initialFacetDefs?.length ?? 0) > 0;

  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [inStockOnly, setInStockOnly] = useState(false);

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [facets, setFacets] = useState<FacetMap>(initialFacets ?? {});
  const [facetDefs, setFacetDefs] = useState<FacetDef[]>(initialFacetDefs ?? []);
  const [nbHits, setNbHits] = useState<number>(initialNbHits ?? initialProducts.length);

  const didInitialQuery = useRef(seededFromServer);

  const runQuery = useCallback(async () => {
    if (!client) return;
    try {
      const res = await client.search([
        { indexName: INDEX_PRODUCTS, params: { query: "", hitsPerPage: 1000, facets: ["*"] } },
      ]);
      const r = res.results[0] as FacetSource & { hits?: RawShopifyHit[] };
      const hidden = hiddenFacets ?? [];
      const defs = facetDefsFromResponse(r, hidden);

      const normalized = (r.hits ?? []).map(normalizeHit);
      const scopedHits = filterKind === "collection"
        ? filterByCollection(normalized, collectionHandle ?? "")
        : filterByBrand(normalized, brandName ?? "");

      const { displayed, facets: localFacets } = applyLocalFacets(scopedHits, {
        selected,
        inStockOnly,
        facetAttrs: ["inStock", ...defs.map((d) => d.attribute)],
      });

      const hasActiveRefinement = inStockOnly || Object.keys(selected).length > 0;
      const isInitialNoRefinement =
        !didInitialQuery.current && initialProducts.length > 0 && !hasActiveRefinement;
      if (!isInitialNoRefinement) {
        setProducts(displayed.map(hitToProduct));
      }
      setFacets(localFacets);
      setFacetDefs(defs);
      setNbHits(displayed.length);
    } catch {
      /* keep current products on error */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKind, collectionHandle, brandName, hiddenFacetsKey, selected, inStockOnly, initialProducts.length]);

  const skippedInitialQuery = useRef(false);
  useEffect(() => {
    if (!skippedInitialQuery.current) {
      skippedInitialQuery.current = true;
      const hasRefinement = inStockOnly || Object.keys(selected).length > 0;
      if (seededFromServer && !hasRefinement) {
        didInitialQuery.current = true;
        return;
      }
    }
    runQuery();
    didInitialQuery.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runQuery]);

  useEffect(() => {
    if (products.length === 0) return;
    trackViewItemList(
      products.map((p, i) => toGa4Item(p, { index: i, listName })),
      listName,
    );
  }, [products, listName]);

  useEffect(() => {
    document.body.style.overflow = filtersOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [filtersOpen]);

  function toggleFacet(attr: string, value: string) {
    setSelected((prev) => {
      const cur = prev[attr] ?? [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      const out = { ...prev, [attr]: next };
      if (!next.length) delete out[attr];
      return out;
    });
  }
  function clearAll() { setSelected({}); setInStockOnly(false); }
  const hasRefinements = inStockOnly || Object.keys(selected).length > 0;

  const sortedProducts = useMemo(() => {
    const withCustomerSkus = products.map((p) => {
      const customerSku = customerSkuMap[p.sku] ?? p.customerSku;
      return customerSku === p.customerSku ? p : { ...p, customerSku };
    });
    switch (sort) {
      case "price-asc":  return [...withCustomerSkus].sort((a, b) => a.price - b.price);
      case "price-desc": return [...withCustomerSkus].sort((a, b) => b.price - a.price);
      case "name":       return [...withCustomerSkus].sort((a, b) => a.name.localeCompare(b.name));
      default:           return withCustomerSkus;
    }
  }, [products, sort, customerSkuMap]);

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

            {/* Availability */}
            <div className="facet">
              <div className="facet-h">
                Availability
                <Icon name="chev" size={14} style={{ color: "var(--muted)" }} />
              </div>
              <div className="facet-opts">
                <label className="facet-opt" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    className="checkbox"
                    style={{ flexShrink: 0 }}
                    checked={inStockOnly}
                    onChange={() => setInStockOnly((v) => !v)}
                  />
                  <span>In stock now</span>
                  {facets.inStock?.true != null && (
                    <span className="ct">{facets.inStock.true.toLocaleString()}</span>
                  )}
                </label>
              </div>
            </div>

            {/* Dynamic facets */}
            {facetDefs.map(({ attribute, label }) => {
              const values = facets[attribute];
              if (!values || Object.keys(values).length === 0) return null;
              const entries = Object.entries(values).sort((a, b) => b[1] - a[1]).slice(0, 8);
              const sel = selected[attribute] ?? [];
              return (
                <div className="facet" key={attribute}>
                  <div className="facet-h">
                    {label}
                    <Icon name="chev" size={14} style={{ color: "var(--muted)" }} />
                  </div>
                  <div className="facet-opts">
                    {entries.map(([value, count]) => (
                      <label key={value} className="facet-opt" style={{ cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          className="checkbox"
                          style={{ flexShrink: 0 }}
                          checked={sel.includes(value)}
                          onChange={() => toggleFacet(attribute, value)}
                        />
                        <span>{value}</span>
                        <span className="ct">{count}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted-2, var(--muted))" }}>
              <Icon name="search" size={11} />
              Powered by Algolia
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
            <strong style={{ color: "var(--ink)" }}>{nbHits.toLocaleString()}</strong>{" "}
            product{nbHits !== 1 ? "s" : ""}
          </span>
          <label style={{ fontSize: 13, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8 }}>
            Sort:
            <select
              className="select"
              style={{ width: "auto", height: 32, fontSize: 12 }}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="best">Best match</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name: A–Z</option>
            </select>
          </label>
        </div>

        {sortedProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 32px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-card)" }}>
            <Icon name="pkg" size={32} style={{ color: "var(--muted-2, var(--muted))", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>{emptyTitle}</h3>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 20px" }}>
              {hasRefinements ? emptyHintRefined : emptyHintInitial}
            </p>
          </div>
        ) : (
          <div className="g4 plp-grid" style={{ gap: 20 }}>
            {sortedProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} listName={listName} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
