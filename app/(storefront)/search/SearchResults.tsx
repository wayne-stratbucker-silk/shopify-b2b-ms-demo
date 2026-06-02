"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { liteClient } from "algoliasearch/lite";
import { ProductCard } from "@/components/product-card";
import { Icon } from "@/components/ui/icons";
import { trackSearch, trackViewItemList, toGa4Item } from "@/lib/analytics";
import {
  normalizeHit, applyLocalFacets, facetDefsFromResponse,
  isInStock,
  type RawShopifyHit, type NormalizedHit, type FacetDef, type FacetSource,
} from "@/lib/algolia/connector-hit";
import { INDEX_PRODUCTS } from "@/lib/algolia/client";
import type { Product, BadgeKind } from "@/types";

const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
const client = APP_ID && SEARCH_KEY ? liteClient(APP_ID, SEARCH_KEY) : null;

const SEARCH_LIST_NAME = "Search Results";
type SortKey = "best" | "price-asc" | "price-desc" | "name";
type FacetMap = Record<string, Record<string, number>>;

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
    leadTime: isInStock(hit) ? "In stock" : "Contact for availability",
    leadTimeDays: isInStock(hit) ? 1 : undefined,
    badges: hit.badges.filter((b): b is BadgeKind =>
      ["new", "best", "bulk", "ship", "sale", "low"].includes(b)
    ),
    tiers: [{ minQty: 1, unitPrice: hit.price }],
    images: hit.imageUrl ? [hit.imageUrl] : undefined,
  };
}

interface Props {
  initialQuery: string;
  initialProducts?: Product[];
}

export function SearchResults({ initialQuery, initialProducts = [] }: Props) {
  const [sort, setSort] = useState<SortKey>("best");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [inStockOnly, setInStockOnly] = useState(false);

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [facets, setFacets] = useState<FacetMap>({});
  const [facetDefs, setFacetDefs] = useState<FacetDef[]>([]);
  const [nbHits, setNbHits] = useState<number>(initialProducts.length);

  const runQuery = useCallback(async () => {
    if (!client) return;
    try {
      const res = await client.search([
        { indexName: INDEX_PRODUCTS, params: { query: initialQuery, hitsPerPage: 1000, facets: ["*"] } },
      ]);
      const r = res.results[0] as FacetSource & { hits?: RawShopifyHit[] };
      const defs = facetDefsFromResponse(r);
      const matched = (r.hits ?? []).map(normalizeHit);
      const { displayed, facets: localFacets } = applyLocalFacets(matched, {
        selected,
        inStockOnly,
        facetAttrs: ["inStock", ...defs.map((d) => d.attribute)],
      });
      setProducts(displayed.map(hitToProduct));
      setFacets(localFacets);
      setFacetDefs(defs);
      setNbHits(displayed.length);
    } catch {
      /* keep current products on error */
    }
  }, [initialQuery, selected, inStockOnly]);

  useEffect(() => { runQuery(); }, [runQuery]);

  useEffect(() => {
    if (initialQuery) trackSearch(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (products.length === 0) return;
    trackViewItemList(
      products.map((p, i) => toGa4Item(p, { index: i, listName: SEARCH_LIST_NAME })),
      SEARCH_LIST_NAME,
    );
  }, [products]);

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
    const list = [...products];
    switch (sort) {
      case "price-asc":  return list.sort((a, b) => a.price - b.price);
      case "price-desc": return list.sort((a, b) => b.price - a.price);
      case "name":       return list.sort((a, b) => a.name.localeCompare(b.name));
      default:           return list;
    }
  }, [products, sort]);

  return (
    <div className="container" style={{ padding: "24px 0 48px" }}>
      <div className="crumbs" style={{ padding: "0 0 12px" }}>
        <span style={{ color: "var(--muted)" }}>Search results</span>
      </div>
      <div className="page-h" style={{ marginBottom: 8 }}>
        <div>
          <h1>{initialQuery ? `Results for "${initialQuery}"` : "All products"}</h1>
          <p className="sub">
            <strong style={{ color: "var(--ink)" }}>{nbHits.toLocaleString()}</strong>{" "}
            product{nbHits !== 1 ? "s" : ""}{initialQuery ? "" : " — browse or search above"}
          </p>
        </div>
      </div>

      <div className="shop-shell">
        <div
          className={`mobile-filter-overlay${filtersOpen ? " open" : ""}`}
          onClick={() => setFiltersOpen(false)}
          aria-hidden="true"
        />

        {/* SIDEBAR */}
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

        {/* MAIN */}
        <div>
          <div className="plp-toolbar">
            <button className="btn btn-ghost btn-sm show-mobile" onClick={() => setFiltersOpen(true)} style={{ gap: 6 }}>
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
              <Icon name="search" size={32} style={{ color: "var(--muted-2, var(--muted))", margin: "0 auto 16px" }} />
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>No products found</h3>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 20px" }}>
                Try a different search term or clear your filters.
              </p>
            </div>
          ) : (
            <div className="g4 plp-grid" style={{ gap: 20 }}>
              {sortedProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} listName={SEARCH_LIST_NAME} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
