import { storefrontQuery, type BuyerContext } from "@/lib/shopify/storefront-client";
import { adminQuery } from "@/lib/shopify/admin-client";
import type { ShopifyProduct, ShopifyCollection } from "@/types";

export const PRODUCT_FIELDS = `
  id
  handle
  title
  vendor
  descriptionHtml
  tags
  featuredImage { url altText }
  images(first: 8) {
    edges { node { url altText } }
  }
  priceRange {
    minVariantPrice { amount currencyCode }
  }
  compareAtPriceRange {
    minVariantPrice { amount currencyCode }
  }
  collections(first: 1) {
    edges { node { handle title } }
  }
  variants(first: 50) {
    edges {
      node {
        id
        sku
        title
        availableForSale
        quantityAvailable
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        selectedOptions { name value }
      }
    }
  }
  metafields(identifiers: [
    { namespace: "custom", key: "uom" },
    { namespace: "custom", key: "pricing_tiers" },
    { namespace: "custom", key: "lead_time" },
    { namespace: "custom", key: "spec_sheet_url" },
    { namespace: "custom", key: "install_guide_url" },
    { namespace: "custom", key: "cad_file_url" },
    { namespace: "custom", key: "product_specs" },
    { namespace: "custom", key: "warranty" },
    { namespace: "custom", key: "msrp" }
  ]) {
    namespace
    key
    value
  }
`;

export async function getProduct(handle: string, buyer?: BuyerContext): Promise<ShopifyProduct | null> {
  const data = await storefrontQuery<{ product: ShopifyProduct | null }>(
    `query GetProduct($handle: String!) {
      product(handle: $handle) { ${PRODUCT_FIELDS} }
    }`,
    { handle },
    buyer,
    [`product:${handle}`],
  );
  return data.product;
}

export async function getCollectionProducts(
  handle: string,
  first = 24,
  after?: string,
  buyer?: BuyerContext,
): Promise<ShopifyCollection | null> {
  const data = await storefrontQuery<{ collection: ShopifyCollection | null }>(
    `query GetCollectionProducts($handle: String!, $first: Int!, $after: String) {
      collection(handle: $handle) {
        id handle title description
        image { url altText }
        products(first: $first, after: $after, sortKey: BEST_SELLING) {
          edges { node { ${PRODUCT_FIELDS} } }
          pageInfo { hasNextPage endCursor }
        }
      }
    }`,
    { handle, first, after },
    buyer,
    [`collection:${handle}`],
  );
  return data.collection;
}

export async function getCollectionMeta(handle: string): Promise<{ title: string; description?: string } | null> {
  const data = await storefrontQuery<{
    collection: { title: string; description?: string } | null;
  }>(
    `query GetCollectionMeta($handle: String!) {
      collection(handle: $handle) { title description }
    }`,
    { handle },
    undefined,
    [`collection-meta:${handle}`],
  );
  return data.collection;
}

export async function getFeaturedProducts(first = 12, buyer?: BuyerContext): Promise<ShopifyProduct[]> {
  const data = await storefrontQuery<{
    products: { edges: Array<{ node: ShopifyProduct }> };
  }>(
    `query GetFeaturedProducts($first: Int!) {
      products(first: $first, sortKey: BEST_SELLING) {
        edges { node { ${PRODUCT_FIELDS} } }
      }
    }`,
    { first },
    buyer,
    ["products:featured"],
  );
  return data.products.edges.map((e) => e.node);
}

// Shopify's own related-product recommendations for a PDP. Purpose-built and
// independent of collection/category handles.
export async function getProductRecommendations(productId: string, buyer?: BuyerContext): Promise<ShopifyProduct[]> {
  const data = await storefrontQuery<{ productRecommendations: ShopifyProduct[] | null }>(
    `query ProductRecommendations($productId: ID!) {
      productRecommendations(productId: $productId, intent: RELATED) { ${PRODUCT_FIELDS} }
    }`,
    { productId },
    buyer,
    [`recommendations:${productId}`],
  );
  return data.productRecommendations ?? [];
}

export async function getProductsByVendor(vendor: string, first = 24, buyer?: BuyerContext): Promise<ShopifyProduct[]> {
  const data = await storefrontQuery<{
    products: { edges: Array<{ node: ShopifyProduct }> };
  }>(
    `query GetProductsByVendor($query: String!, $first: Int!) {
      products(first: $first, query: $query) {
        edges { node { ${PRODUCT_FIELDS} } }
      }
    }`,
    { query: `vendor:${vendor}`, first },
    buyer,
    [`products:vendor:${vendor}`],
  );
  return data.products.edges.map((e) => e.node);
}

// ─── SKU → product resolution (Admin API) ────────────────────────────────────
//
// IMPORTANT: A variant SKU is NOT a supported filter field on the Storefront
// `products(query: ...)` connection. The supported fields are available_for_sale,
// created_at, product_type, tag, tag_not, title, updated_at, variants.price and
// vendor only. Passing `sku:VALUE` to the Storefront API therefore does NOT
// filter by SKU — Shopify silently degrades it to a fuzzy full-text search,
// tokenizing hyphenated SKUs and returning wrong/partial results (verified: an
// OR-joined batch of 12 real SKUs resolved only 2 exactly).
//
// Exact SKU lookups must go through the Admin `productVariants(query: "sku:...")`
// query, where `sku` IS a documented, exact filter field.
// Docs: https://shopify.dev/docs/api/admin-graphql/latest/queries/productvariants

export interface ResolvedSkuVariant {
  sku: string;
  title: string;
  vendor?: string;
  handle: string;
  imageUrl?: string;
  price: number;
  compareAtPrice?: number;
  availableForSale: boolean;
  inventoryQuantity?: number;
}

/**
 * Resolve a batch of exact variant SKUs to their products via the Admin API.
 * Returns a Map keyed by the exact SKU; SKUs that don't exist are simply absent.
 */
export async function resolveSkuVariants(skus: string[]): Promise<Map<string, ResolvedSkuVariant>> {
  const unique = [...new Set(skus.map((s) => s.trim()).filter(Boolean))];
  const result = new Map<string, ResolvedSkuVariant>();
  if (!unique.length) return result;

  const query = unique.map((s) => `sku:${s}`).join(" OR ");
  const data = await adminQuery<{
    productVariants: {
      edges: Array<{
        node: {
          sku: string;
          price: string;
          compareAtPrice: string | null;
          availableForSale: boolean;
          inventoryQuantity: number | null;
          product: {
            title: string;
            vendor: string | null;
            handle: string;
            featuredImage: { url: string } | null;
          };
        };
      }>;
    };
  }>(
    `query ResolveSkuVariants($query: String!) {
      productVariants(first: 250, query: $query) {
        edges {
          node {
            sku
            price
            compareAtPrice
            availableForSale
            inventoryQuantity
            product { title vendor handle featuredImage { url } }
          }
        }
      }
    }`,
    { query },
  );

  const requested = new Set(unique);
  for (const { node } of data.productVariants.edges) {
    // Guard against any near-matches: keep only exact SKU equality, first wins.
    if (!requested.has(node.sku) || result.has(node.sku)) continue;
    const compareAt = node.compareAtPrice ? parseFloat(node.compareAtPrice) : 0;
    result.set(node.sku, {
      sku: node.sku,
      title: node.product.title,
      vendor: node.product.vendor || undefined,
      handle: node.product.handle,
      imageUrl: node.product.featuredImage?.url,
      price: parseFloat(node.price) || 0,
      compareAtPrice: compareAt > 0 ? compareAt : undefined,
      availableForSale: node.availableForSale,
      inventoryQuantity: node.inventoryQuantity ?? undefined,
    });
  }
  return result;
}

/** Resolve a single variant SKU to its product handle via the Admin API. */
export async function resolveSkuToHandle(sku: string): Promise<string | null> {
  const map = await resolveSkuVariants([sku]);
  return map.get(sku.trim())?.handle ?? null;
}

/**
 * Fetch the full product (with variants, metafields, images) for a given variant
 * SKU. Resolves the exact handle via the Admin API, then loads the product
 * through the Storefront API so callers keep buyer-context pricing and the full
 * ShopifyProduct shape. Returns null if the SKU does not exist.
 */
export async function getProductBySku(sku: string, buyer?: BuyerContext): Promise<ShopifyProduct | null> {
  const handle = await resolveSkuToHandle(sku);
  if (!handle) return null;
  return getProduct(handle, buyer);
}

export async function getCollections(first = 20): Promise<Array<{ id: string; handle: string; title: string; image?: { url: string; altText?: string }; description?: string }>> {
  const data = await storefrontQuery<{
    collections: { edges: Array<{ node: { id: string; handle: string; title: string; description?: string; image?: { url: string; altText?: string } } }> };
  }>(
    `query GetCollections($first: Int!) {
      collections(first: $first) {
        edges { node { id handle title description image { url altText } } }
      }
    }`,
    { first },
    undefined,
    ["collections"],
  );
  return data.collections.edges.map((e) => e.node);
}

// ─── Menu / Navigation ───────────────────────────────────────────────────────

interface ShopifyMenuItem {
  id: string;
  title: string;
  url: string;
  type: string;
  items: ShopifyMenuItem[];
}

// NavNode shape kept local to avoid a circular import with mega-nav.tsx.
export interface MenuNavNode {
  id: string;
  name: string;
  slug: string;
  url: string;
  children?: MenuNavNode[];
}

function menuItemToNavNode(item: ShopifyMenuItem): MenuNavNode {
  let url = item.url;
  try { url = new URL(item.url).pathname; } catch {}
  const slug = url.split("/").filter(Boolean).pop() ?? "";
  return {
    id: item.id,
    name: item.title,
    slug,
    url,
    children: item.items?.length ? item.items.map(menuItemToNavNode) : undefined,
  };
}

export async function getMenu(handle: string): Promise<MenuNavNode[]> {
  const data = await storefrontQuery<{
    menu: { items: ShopifyMenuItem[] } | null;
  }>(
    `query GetMenu($handle: String!) {
      menu(handle: $handle) {
        items {
          id title url type
          items {
            id title url type
            items { id title url type }
          }
        }
      }
    }`,
    { handle },
    undefined,
    [`menu:${handle}`],
  );
  return data.menu?.items.map(menuItemToNavNode) ?? [];
}
