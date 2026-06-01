// Normalizes records the storefront reads from the "catalyst B2B demo" index
// into a canonical hit shape. The live index is populated by the BigCommerce
// Algolia integration with a JSON transform that emits flat, pre-shaped fields
// (price, stockQty, brand, category, image, path, badges, inStock, productId,
// variantSku, parentSku, in_stock_<locationId>, etc.) — the same shape the
// emergency-backfill CLI at `scripts/algolia-sync.mjs` produces. We also keep
// the BC-native field names (brand_name, calculated_prices.USD, inventory,
// custom_fields.Badge) as fallbacks so reconfiguring the connector to skip the
// transform doesn't break the storefront.

type Money = { USD?: number } | undefined;

export interface RawConnectorHit {
  objectID: string;
  name?: string;
  sku?: string;
  mpn?: string;

  // Pre-shaped fields written by the connector's JSON transform (and the
  // emergency CLI). When present, these are the authoritative values.
  productId?: number;
  brand?: string;
  category?: string;
  price?: number;
  listPrice?: number;
  stockQty?: number;
  inStock?: boolean;
  image?: string | null;
  path?: string;
  badges?: string[];
  parentSku?: string;
  variantSku?: string;
  optionLabel?: string;
  optionName?: string;
  uom?: string;
  leadTime?: string;

  // BC-native shape — kept as fallbacks for records written without the
  // transform.
  brand_name?: string;
  url?: string;
  image_url?: string;
  in_stock?: boolean;
  inventory?: number;
  inventory_tracking?: string; // "none" | "product" | "variant"
  default_price?: number;
  prices?: Money;
  retail_prices?: Money;
  calculated_prices?: Money;

  category_ids?: number[];
  categories_without_path?: string[];
  categories?: { lvl0?: string[]; lvl1?: string[] };
  custom_fields?: Record<string, string[] | string>;
  variants?: Array<{ id: number; sku?: string; in_stock?: boolean }>;
  [key: string]: unknown;
}

// Canonical fields every storefront consumer reads. Mirrors the field names the
// (now-removed) custom-sync record used, so hitToProduct/mapHit/autocomplete/
// quick-order all keep working unchanged once a hit is normalized.
export interface NormalizedHit extends RawConnectorHit {
  productId?: number;
  brand: string;
  category: string;
  price: number;
  listPrice: number;
  stockQty: number;
  trackInventory?: boolean;
  image: string | null;
  path: string;
  badges: string[];
  variantId?: number;
  // Parent product name with the variant option suffix removed (e.g.
  // "LED Combo Exit/Emergency — Single Red" → "LED Combo Exit/Emergency").
  // The connector indexes variants as full "<parent> — <option>" strings;
  // PLP cards represent the parent product, so display the parent name.
  // Falls back to `name` when there's no optionLabel or the expected
  // suffix isn't present.
  parentProductName?: string;
}

// The connector writes variant records with name = "<parent> — <optionLabel>"
// (em-dash with surrounding spaces). Strip that suffix to recover the parent
// product name for PLP cards. Returns the original name when there's no
// optionLabel or the expected suffix isn't present at the end — never the SKU,
// never an empty string.
function deriveParentProductName(
  name: string | undefined,
  optionLabel: string | undefined,
): string | undefined {
  if (!name) return undefined;
  if (!optionLabel) return name;
  const suffix = ` — ${optionLabel}`;
  return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
}

// Maps the raw record's inventory signals to a boolean trackInventory:
//   - inventory_tracking present → "none" means untracked, anything else tracked.
//   - inventory_tracking absent + connector says inStock:true with stockQty:0 →
//     untracked (the only shape that fits: always available, no qty semantics).
//   - Otherwise undefined: pill falls through to the qty-based branches.
function resolveTrackInventory(
  raw: RawConnectorHit,
  stockQty: number,
): boolean | undefined {
  if (raw.inventory_tracking != null) return raw.inventory_tracking !== "none";
  const inStock = raw.inStock ?? raw.in_stock;
  if (inStock === true && stockQty === 0) return false;
  return undefined;
}

// Badge custom field arrives as a single-element array holding a CSV
// (e.g. ["new,ship"]); flatten + split into individual badge tokens.
function parseBadges(badge: string[] | string | undefined): string[] {
  if (!badge) return [];
  const arr = Array.isArray(badge) ? badge : [badge];
  return arr
    .flatMap((b) => String(b).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

export function normalizeHit(raw: RawConnectorHit): NormalizedHit {
  // objectID is `prod-${productId}` for products without variants and
  // `var-${variantId}` for variant records — Number() returns NaN for both, so
  // we read the top-level productId field the connector emits.
  const objectIdNum = Number(raw.objectID);
  const productId =
    typeof raw.productId === "number"
      ? raw.productId
      : Number.isFinite(objectIdNum)
        ? objectIdNum
        : undefined;

  // Prefer the flat pre-shaped fields the connector's JSON transform emits;
  // fall back to BC-native field names if a record was written without the
  // transform.
  const price =
    raw.price ??
    raw.calculated_prices?.USD ??
    raw.default_price ??
    raw.prices?.USD ??
    0;
  const listPrice =
    raw.listPrice ?? raw.retail_prices?.USD ?? raw.prices?.USD ?? price;
  const stockQty = raw.stockQty ?? raw.inventory ?? 0;

  // var-${variantId} → variantId; flat variantSku records carry the same
  // info but we also support the nested `variants[0]` BC-native shape.
  let variantId: number | undefined;
  if (typeof raw.objectID === "string" && raw.objectID.startsWith("var-")) {
    const n = Number(raw.objectID.slice(4));
    if (Number.isFinite(n)) variantId = n;
  }
  if (variantId == null) variantId = raw.variants?.[0]?.id;

  return {
    ...raw,
    productId,
    sku: raw.sku,
    brand: raw.brand ?? raw.brand_name ?? "",
    category:
      raw.category ??
      raw.categories_without_path?.[0] ??
      raw.categories?.lvl0?.[0] ??
      "",
    price,
    listPrice,
    stockQty,
    // BC inventory_tracking "none" means stock isn't tracked — the product is
    // always available, and the connector reports stockQty:0 for it. Drive the
    // stock pill off this so untracked products show "Available", not "Out of
    // stock". When the connector's JSON transform omits inventory_tracking,
    // fall back to the structural signal `inStock: true && stockQty === 0`,
    // which only fits an always-available untracked record.
    trackInventory: resolveTrackInventory(raw, stockQty),
    image: raw.image ?? raw.image_url ?? null,
    path: ((raw.path ?? raw.url) ?? "").replace(/\/$/, "") || "#",
    badges: Array.isArray(raw.badges)
      ? raw.badges.map(String).filter(Boolean)
      : parseBadges(raw.custom_fields?.Badge),
    variantId,
    parentProductName: deriveParentProductName(raw.name, raw.optionLabel),
  };
}

// ─── Client-side filtering & faceting ───────────────────────────────────────
//
// WHICH facets to show is owned by the connector: we read the index's
// "facet display" config (renderingContent.facetOrdering) and the set of
// attributes Algolia actually facets (the `facets` block of a `facets:['*']`
// response) — see facetDefsFromResponse below. Nothing about the facet list is
// hardcoded; enable/disable/reorder a filter in the connector and it flows
// straight through.
//
// HOW counts are computed stays client-side: the connector hasn't made
// category_ids facetable for server-side filtering, and the catalog is small
// (tens of records), so we fetch all records once and do category filtering +
// disjunctive facet counting in JS. (If the catalog grows large, push filtering
// to server-side facetFilters.)

export type FacetMap = Record<string, Record<string, number>>;

// A facet to render: the connector attribute name + a display label.
export interface FacetDef {
  attribute: string;
  label: string;
}

// The shape of an Algolia search result we read facet config from.
export interface FacetSource {
  facets?: Record<string, Record<string, number>>;
  renderingContent?: { facetOrdering?: { facets?: { order?: string[] } } };
}

function isInStock(h: NormalizedHit): boolean {
  // The connector's JSON transform writes `inStock`; BC-native uses `in_stock`.
  const flag = h.inStock ?? h.in_stock;
  return flag === true || (flag == null && h.stockQty > 0);
}

// Resolve a possibly-dotted attribute path against a hit (e.g. "categories.lvl0",
// "custom_fields.Color"). Returns undefined if any segment is missing.
function resolvePath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc != null && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

// The facet values a hit contributes for a given connector attribute. Handles
// dotted paths and skips object-valued attributes (e.g. the `categories`
// hierarchy root) so they never render as "[object Object]".
function facetValuesOf(h: NormalizedHit, attr: string): string[] {
  if (attr === "in_stock") return [String(isInStock(h))];
  if (attr === "brand_name") return h.brand ? [h.brand] : [];
  const raw = attr.includes(".") ? resolvePath(h, attr) : (h as Record<string, unknown>)[attr];
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) {
    return raw.filter((v) => v != null && typeof v !== "object").map(String);
  }
  if (typeof raw === "object") return [];
  return [String(raw)];
}

// Display labels for known connector attributes; everything else is humanized
// from the attribute name. This is display-only — it never decides WHICH facets
// appear (that's the connector's facet-display config).
const FACET_LABELS: Record<string, string> = {
  "categories.lvl0": "Category",
  "categories.lvl1": "Subcategory",
  brand: "Brand",
  brand_name: "Brand",
  default_price: "Price",
  option_names: "Options",
  awgSize: "AWG Size",
  baseType: "Base Type",
  cct: "Color Temperature (CCT)",
  ipRating: "IP Rating",
  lampType: "Lamp Type",
  loadType: "Load Type",
  mountingType: "Mounting Type",
  nemaConfig: "NEMA Configuration",
  tradeSize: "Trade Size",
  packQty: "Pack Quantity",
};

export function facetLabel(attr: string): string {
  if (FACET_LABELS[attr]) return FACET_LABELS[attr];
  const last = attr.replace(/^custom_fields\./, "").split(".").pop() ?? attr;
  return last
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Derive the ordered facet list from an Algolia response.
//
// Preferred source: the connector's facet-display config
// (renderingContent.facetOrdering.facets.order). When the operator hasn't
// enabled facet-display ordering in the Algolia dashboard that block is
// missing/empty, in which case we fall back to every attribute Algolia
// actually returned counts for. Either way we keep only attributes that
// (a) aren't in the hidden set (in-stock toggle is its own UI; category_ids
// is the underlying filter, not a facet to render) and (b) have at least one
// value in this result.
const HIDDEN_FACETS = new Set([
  "in_stock",
  "inStock",
  "category_ids",
  "categories_without_path",
]);

export function facetDefsFromResponse(result: FacetSource): FacetDef[] {
  const order = result.renderingContent?.facetOrdering?.facets?.order;
  const faceted = result.facets ?? {};
  const candidates =
    order && order.length > 0 ? order : Object.keys(faceted);
  const seen = new Set<string>();
  return candidates
    .filter((attr) => !HIDDEN_FACETS.has(attr))
    .filter((attr) => faceted[attr] && Object.keys(faceted[attr]).length > 0)
    .filter((attr) => {
      if (seen.has(attr)) return false;
      seen.add(attr);
      return true;
    })
    .map((attr) => ({ attribute: attr, label: facetLabel(attr) }));
}

// True when the hit satisfies every selected refinement (OR within an
// attribute, AND across attributes), optionally ignoring one attribute so a
// facet's own counts stay disjunctive.
function matchesSelected(
  h: NormalizedHit,
  selected: Record<string, string[]>,
  exceptAttr?: string,
): boolean {
  for (const [attr, vals] of Object.entries(selected)) {
    if (!vals.length || attr === exceptAttr) continue;
    const hv = facetValuesOf(h, attr);
    if (!vals.some((v) => hv.includes(v))) return false;
  }
  return true;
}

// Restrict to a category via the stable numeric BC category id (category_ids),
// not the display name — renaming a category in BC never empties the PLP.
export function filterByCategory(hits: NormalizedHit[], categoryId: number): NormalizedHit[] {
  return hits.filter((h) => Array.isArray(h.category_ids) && h.category_ids.includes(categoryId));
}

// Restrict to a brand by its BC display name. The connector indexes the full
// brand name string (e.g. "Lithonia Lighting") on every hit; we compare
// case-insensitively and trim to absorb connector casing drift. We filter on
// name rather than ID because Algolia hits don't carry the BC brand entity ID.
export function filterByBrand(hits: NormalizedHit[], brandName: string): NormalizedHit[] {
  const target = brandName.trim().toLowerCase();
  if (!target) return [];
  return hits.filter((h) => (h.brand ?? "").trim().toLowerCase() === target);
}

// Reduce variant-per-record output to one card per parent product. The
// connector indexes products with variants as multiple `var-${variantId}`
// records sharing the same `productId`; products without variants come through
// as a single `prod-${productId}` record. We keep the first hit's fields for
// the card representation (price/SKU resolve via that first variant
// downstream) but aggregate stockQty across ALL variants in the group, and
// flip `inStock`/`in_stock` true whenever any variant has stock — otherwise a
// parent product with one out-of-stock variant ranked first would display
// "Out of stock" even when other variants are available.
export function dedupByParent(hits: NormalizedHit[]): NormalizedHit[] {
  const order: Array<number | string> = [];
  const groups = new Map<number | string, NormalizedHit>();
  for (const h of hits) {
    const key = h.productId ?? h.parentSku ?? h.sku ?? h.objectID;
    if (key == null) continue;
    const existing = groups.get(key);
    if (!existing) {
      order.push(key);
      groups.set(key, { ...h });
      continue;
    }
    existing.stockQty += h.stockQty;
    // `inStock` (connector transform) or `in_stock` (BC-native) — flip true if
    // either is true on the incoming variant or if it has stockQty > 0.
    const incomingInStock =
      h.inStock === true ||
      h.in_stock === true ||
      ((h.inStock == null && h.in_stock == null) && h.stockQty > 0);
    if (incomingInStock) {
      if (existing.inStock != null || h.inStock != null) existing.inStock = true;
      if (existing.in_stock != null || h.in_stock != null) existing.in_stock = true;
    }
    // inventory_tracking is a parent-level setting in BC, so sibling variant
    // records share it. Adopt the first defined value we see across the group
    // — a missing field on the first hit (e.g. a connector transform that
    // dropped it on one record) shouldn't shadow a defined value on a sibling.
    if (existing.trackInventory == null && h.trackInventory != null) {
      existing.trackInventory = h.trackInventory;
    }
  }
  return order.map((k) => groups.get(k)!);
}

// Apply the sidebar refinements in JS and compute facet counts. Mirrors
// Algolia's behaviour: each facet's counts are computed with the OTHER
// refinements applied (disjunctive), so you can still see/pick sibling values.
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
    // The in-stock toggle shouldn't shrink its own count.
    const applyStock = inStockOnly && attr !== "in_stock";
    const base = hits.filter(
      (h) => matchesSelected(h, selected, attr) && (!applyStock || isInStock(h)),
    );
    const counts: Record<string, number> = {};
    for (const h of base) for (const v of facetValuesOf(h, attr)) counts[v] = (counts[v] ?? 0) + 1;
    facets[attr] = counts;
  }
  return { displayed, facets };
}
