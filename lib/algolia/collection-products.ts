// Server-side Algolia fetchers for the PLP and search page.
// These run at request time to seed initial products + facets so the
// first paint is final (no post-hydration grid swap / CLS).

import { algoliasearch } from "algoliasearch";
import {
  normalizeHit, filterByCollection, filterByBrand,
  applyLocalFacets, facetDefsFromResponse,
  type RawShopifyHit, type NormalizedHit, type FacetMap, type FacetDef, type FacetSource,
} from "./connector-hit";
import { INDEX_PRODUCTS } from "./client";
import type { Product, BadgeKind } from "@/types";

const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? "";
const SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY ?? "";

function getClient() {
  if (!APP_ID || !SEARCH_KEY) return null;
  return algoliasearch(APP_ID, SEARCH_KEY);
}

export interface PlpSeed {
  products: Product[];
  facets: FacetMap;
  facetDefs: FacetDef[];
  nbHits: number;
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

async function fetchAllHits(query = ""): Promise<{ hits: NormalizedHit[]; source: FacetSource }> {
  const client = getClient();
  if (!client) return { hits: [], source: {} };
  try {
    const res = await client.search([
      { indexName: INDEX_PRODUCTS, params: { query, hitsPerPage: 1000, facets: ["*"] } },
    ]);
    const result = res.results[0] as FacetSource & { hits?: RawShopifyHit[] };
    const hits = (result.hits ?? []).map(normalizeHit);
    return { hits, source: result };
  } catch {
    return { hits: [], source: {} };
  }
}

export async function fetchCollectionPLP(collectionHandle: string): Promise<PlpSeed | null> {
  const { hits, source } = await fetchAllHits();
  if (!hits.length) return null;

  const scopedHits = filterByCollection(hits, collectionHandle);
  const facetDefs = facetDefsFromResponse(source, [collectionHandle ? "category" : undefined].filter(Boolean) as string[]);
  const { displayed, facets } = applyLocalFacets(scopedHits, {
    selected: {},
    inStockOnly: false,
    facetAttrs: ["inStock", ...facetDefs.map((d) => d.attribute)],
  });

  return {
    products: displayed.map(hitToProduct),
    facets,
    facetDefs,
    nbHits: displayed.length,
  };
}

export async function fetchBrandPLP(brandName: string): Promise<PlpSeed | null> {
  const { hits, source } = await fetchAllHits();
  if (!hits.length) return null;

  const scopedHits = filterByBrand(hits, brandName);
  const facetDefs = facetDefsFromResponse(source, ["brand"]);
  const { displayed, facets } = applyLocalFacets(scopedHits, {
    selected: {},
    inStockOnly: false,
    facetAttrs: ["inStock", ...facetDefs.map((d) => d.attribute)],
  });

  return {
    products: displayed.map(hitToProduct),
    facets,
    facetDefs,
    nbHits: displayed.length,
  };
}

export async function fetchSearchPLP(query: string): Promise<PlpSeed> {
  const { hits, source } = await fetchAllHits(query);
  const facetDefs = facetDefsFromResponse(source);
  const { displayed, facets } = applyLocalFacets(hits, {
    selected: {},
    inStockOnly: false,
    facetAttrs: ["inStock", ...facetDefs.map((d) => d.attribute)],
  });

  return {
    products: displayed.map(hitToProduct),
    facets,
    facetDefs,
    nbHits: displayed.length,
  };
}

// Re-export for components
export type { FacetMap, FacetDef, PlpSeed as PlpResult };
