// Normalizes records from the "shopify_products" Algolia index (populated by
// scripts/algolia-sync.mts) into the canonical NormalizedHit shape, and
// provides client-side filtering and facet counting for the PLP and search.

export interface RawShopifyHit {
  objectID: string;       // Shopify Product GID (gid://shopify/Product/...)
  handle: string;
  name: string;
  sku: string;
  brand: string;          // vendor
  price: number;
  compareAtPrice?: number;
  imageUrl?: string;
  category: string;       // first collection handle
  inStock: boolean;
  totalInventory: number;
  uom: string;
  tags: string[];
  [key: string]: unknown;
}

export interface NormalizedHit extends RawShopifyHit {
  image: string | null;
  stockQty: number;
  listPrice: number;
  path: string;
  badges: string[];
  trackInventory: boolean;
}

export function normalizeHit(raw: RawShopifyHit): NormalizedHit {
  const price = typeof raw.price === "number" ? raw.price : 0;
  const compareAt = typeof raw.compareAtPrice === "number" ? raw.compareAtPrice : 0;
  return {
    ...raw,
    image: raw.imageUrl ?? null,
    stockQty: typeof raw.totalInventory === "number" ? raw.totalInventory : 0,
    listPrice: compareAt > price ? compareAt : price,
    path: `/products/${raw.handle}`,
    badges: Array.isArray(raw.tags)
      ? raw.tags.filter((t) => ["new", "best", "bulk", "ship", "sale", "low"].includes(t))
      : [],
    trackInventory: true,
  };
}

// ─── Filtering ───────────────────────────────────────────────────────────────

export function filterByCollection(hits: NormalizedHit[], collectionHandle: string): NormalizedHit[] {
  const h = collectionHandle.toLowerCase();
  return hits.filter((hit) => hit.category?.toLowerCase() === h);
}

export function filterByBrand(hits: NormalizedHit[], brandName: string): NormalizedHit[] {
  const target = brandName.trim().toLowerCase();
  if (!target) return [];
  return hits.filter((h) => h.brand?.trim().toLowerCase() === target);
}

// ─── Facet types + helpers ───────────────────────────────────────────────────

export type FacetMap = Record<string, Record<string, number>>;

export interface FacetDef {
  attribute: string;
  label: string;
}

export interface FacetSource {
  facets?: Record<string, Record<string, number>>;
  renderingContent?: { facetOrdering?: { facets?: { order?: string[] } } };
}

const FACET_LABELS: Record<string, string> = {
  brand: "Brand",
  category: "Category",
  inStock: "Availability",
  uom: "Unit of Measure",
  tags: "Tags",
};

function facetLabel(attr: string): string {
  return FACET_LABELS[attr] ??
    attr.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const HIDDEN_FACETS = new Set(["inStock", "objectID", "handle", "path", "image", "imageUrl", "totalInventory", "stockQty", "price", "compareAtPrice"]);

// When the Algolia index has no facet config, fall back to these sensible defaults.
const DEFAULT_FACETS: FacetDef[] = [
  { attribute: "brand", label: "Brand" },
];

export function facetDefsFromResponse(result: FacetSource, hiddenAttrs?: string[]): FacetDef[] {
  const hidden = new Set([...HIDDEN_FACETS, ...(hiddenAttrs ?? [])]);
  const order = result.renderingContent?.facetOrdering?.facets?.order;
  const faceted = result.facets ?? {};

  let candidates: string[];
  if (order && order.length > 0) {
    candidates = order;
  } else if (Object.keys(faceted).length > 0) {
    candidates = Object.keys(faceted);
  } else {
    return DEFAULT_FACETS.filter((d) => !hidden.has(d.attribute));
  }

  const seen = new Set<string>();
  return candidates
    .filter((attr) => !hidden.has(attr))
    .filter((attr) => {
      if (seen.has(attr)) return false;
      seen.add(attr);
      return true;
    })
    .map((attr) => ({ attribute: attr, label: facetLabel(attr) }));
}

// ─── Client-side facet computation ──────────────────────────────────────────

export function isInStock(h: NormalizedHit): boolean {
  return h.inStock === true || h.totalInventory > 0;
}

function facetValuesOf(h: NormalizedHit, attr: string): string[] {
  if (attr === "inStock") return [String(isInStock(h))];
  const raw = (h as Record<string, unknown>)[attr];
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) return raw.filter((v) => v != null && typeof v !== "object").map(String);
  if (typeof raw === "object") return [];
  return [String(raw)];
}

function matchesSelected(
  h: NormalizedHit,
  selected: Record<string, string[]>,
  exceptAttr?: string,
): boolean {
  for (const [attr, vals] of Object.entries(selected)) {
    if (!vals.length || attr === exceptAttr) continue;
    if (!vals.some((v) => facetValuesOf(h, attr).includes(v))) return false;
  }
  return true;
}

export function applyLocalFacets(
  hits: NormalizedHit[],
  opts: { selected: Record<string, string[]>; inStockOnly: boolean; facetAttrs: string[] },
): { displayed: NormalizedHit[]; facets: FacetMap } {
  const { selected, inStockOnly, facetAttrs } = opts;
  const displayed = hits.filter(
    (h) => matchesSelected(h, selected) && (!inStockOnly || isInStock(h)),
  );
  const facets: FacetMap = {};
  for (const attr of facetAttrs) {
    const applyStock = inStockOnly && attr !== "inStock";
    const base = hits.filter(
      (h) => matchesSelected(h, selected, attr) && (!applyStock || isInStock(h)),
    );
    const counts: Record<string, number> = {};
    for (const h of base) for (const v of facetValuesOf(h, attr)) counts[v] = (counts[v] ?? 0) + 1;
    facets[attr] = counts;
  }
  return { displayed, facets };
}

// Backward-compat aliases
export type RawConnectorHit = RawShopifyHit;
export { normalizeHit as mapConnectorHit };
