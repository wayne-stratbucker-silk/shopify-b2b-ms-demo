// Native Shopify PLP fetchers — collection listing + search results.
//
// These replace the Algolia-backed PLP/search seed. Products AND facets come
// straight from the Storefront API: `collection.products(filters:)` and
// `search(productFilters:)` both return the available filter facets alongside
// the matching products, so faceting is server-driven with no search index.
//
// Facet selection round-trips through the URL: each facet value carries an
// opaque `input` JSON string (Shopify's own filter representation). The UI
// stashes selected inputs in the query string and we parse them straight back
// into the `filters` / `productFilters` argument here — no client-side index.

import { storefrontQuery, type BuyerContext } from "@/lib/shopify/storefront-client";
import { mapProduct } from "@/lib/shopify/product-fetcher";
import { PRODUCT_FIELDS } from "@/lib/shopify/queries/products";
import type { Product, ShopifyProduct } from "@/types";

// Storefront max page size.
const MAX_FIRST = 250;

export type PlpSortKey = "best" | "price-asc" | "price-desc" | "title";

/** A single selectable value within a facet. `input` is Shopify's opaque JSON. */
export interface PlpFacetValue {
  id: string;
  label: string;
  count: number;
  input: string;
}

/** A facet group. `type` is Shopify's Filter type: LIST | PRICE_RANGE | BOOLEAN. */
export interface PlpFacet {
  id: string;
  label: string;
  type: string;
  values: PlpFacetValue[];
}

export interface PlpResult {
  title?: string;
  description?: string;
  products: Product[];
  facets: PlpFacet[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  totalCount?: number;
}

/** A parsed Shopify ProductFilter (whatever a facet value's `input` decoded to). */
export type ProductFilterInput = Record<string, unknown>;

interface FetchOpts {
  filters?: ProductFilterInput[];
  sort?: PlpSortKey;
  first?: number;
  after?: string;
  buyer?: BuyerContext;
}

interface RawFacet {
  id: string;
  label: string;
  type: string;
  values: Array<{ id: string; label: string; count: number; input: string }>;
}

function mapFacets(filters: RawFacet[] | undefined): PlpFacet[] {
  return (filters ?? []).map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type,
    values: (f.values ?? []).map((v) => ({
      id: v.id,
      label: v.label,
      count: v.count,
      input: v.input,
    })),
  }));
}

// ProductCollectionSortKeys supports BEST_SELLING/PRICE/TITLE (+ others); the
// search connection's SearchSortKeys only supports RELEVANCE/PRICE.
function collectionSort(sort: PlpSortKey): { sortKey: string; reverse: boolean } {
  switch (sort) {
    case "price-asc":  return { sortKey: "PRICE", reverse: false };
    case "price-desc": return { sortKey: "PRICE", reverse: true };
    case "title":      return { sortKey: "TITLE", reverse: false };
    default:           return { sortKey: "BEST_SELLING", reverse: false };
  }
}
function searchSort(sort: PlpSortKey): { sortKey: string; reverse: boolean } {
  switch (sort) {
    case "price-asc":  return { sortKey: "PRICE", reverse: false };
    case "price-desc": return { sortKey: "PRICE", reverse: true };
    default:           return { sortKey: "RELEVANCE", reverse: false };
  }
}

/** Decode the repeatable `filter` query param (each value is an opaque input JSON). */
export function parsePlpFilters(raw?: string | string[]): ProductFilterInput[] {
  const arr = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
  const out: ProductFilterInput[] = [];
  for (const s of arr) {
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === "object") out.push(parsed as ProductFilterInput);
    } catch { /* ignore malformed filter param */ }
  }
  return out;
}

/** Coerce the `sort` query param to a known sort key (defaults to "best"). */
export function parsePlpSort(raw?: string | string[]): PlpSortKey {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "price-asc" || v === "price-desc" || v === "title" ? v : "best";
}

export async function getCollectionPlp(
  handle: string,
  { filters = [], sort = "best", first = MAX_FIRST, after, buyer }: FetchOpts = {},
): Promise<PlpResult | null> {
  const { sortKey, reverse } = collectionSort(sort);
  const data = await storefrontQuery<{
    collection: {
      title: string;
      description?: string;
      products: {
        filters?: RawFacet[];
        edges: Array<{ node: ShopifyProduct }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } | null;
  }>(
    `query CollectionPlp($handle: String!, $first: Int!, $after: String, $filters: [ProductFilter!], $sortKey: ProductCollectionSortKeys, $reverse: Boolean) {
      collection(handle: $handle) {
        title
        description
        products(first: $first, after: $after, filters: $filters, sortKey: $sortKey, reverse: $reverse) {
          filters { id label type values { id label count input } }
          edges { node { ${PRODUCT_FIELDS} } }
          pageInfo { hasNextPage endCursor }
        }
      }
    }`,
    { handle, first, after, filters, sortKey, reverse },
    buyer,
    [`collection:${handle}`],
  );

  if (!data.collection) return null;
  const c = data.collection;
  return {
    title: c.title,
    description: c.description,
    products: c.products.edges.map((e) => mapProduct(e.node)),
    facets: mapFacets(c.products.filters),
    pageInfo: c.products.pageInfo,
  };
}

export async function getSearchPlp(
  query: string,
  { filters = [], sort = "best", first = MAX_FIRST, after, buyer }: FetchOpts = {},
): Promise<PlpResult> {
  if (!query) {
    return { products: [], facets: [], pageInfo: { hasNextPage: false, endCursor: null }, totalCount: 0 };
  }
  const { sortKey, reverse } = searchSort(sort);
  const data = await storefrontQuery<{
    search: {
      totalCount: number;
      productFilters?: RawFacet[];
      edges: Array<{ node: ShopifyProduct }>;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  }>(
    `query SearchPlp($query: String!, $first: Int!, $after: String, $productFilters: [ProductFilter!], $sortKey: SearchSortKeys, $reverse: Boolean) {
      search(query: $query, types: PRODUCT, first: $first, after: $after, productFilters: $productFilters, sortKey: $sortKey, reverse: $reverse) {
        totalCount
        productFilters { id label type values { id label count input } }
        edges { node { ... on Product { ${PRODUCT_FIELDS} } } }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    { query, first, after, productFilters: filters, sortKey, reverse },
    buyer,
    [`search:${query}`],
  );

  const s = data.search;
  return {
    products: (s.edges ?? []).map((e) => e.node).filter((n) => !!n?.id).map((n) => mapProduct(n)),
    facets: mapFacets(s.productFilters),
    pageInfo: s.pageInfo,
    totalCount: s.totalCount,
  };
}
