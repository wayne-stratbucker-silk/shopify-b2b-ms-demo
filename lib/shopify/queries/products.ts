import { storefrontQuery, type BuyerContext } from "@/lib/shopify/storefront-client";
import type { ShopifyProduct, ShopifyCollection } from "@/types";

const PRODUCT_FIELDS = `
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

export async function getProductBySku(sku: string): Promise<ShopifyProduct | null> {
  const data = await storefrontQuery<{
    products: { edges: Array<{ node: ShopifyProduct }> };
  }>(
    `query GetProductBySku($query: String!) {
      products(first: 1, query: $query) {
        edges { node { ${PRODUCT_FIELDS} } }
      }
    }`,
    { query: `sku:${sku}` },
  );
  return data.products.edges[0]?.node ?? null;
}

export async function validateSkus(skus: string[]): Promise<Map<string, ShopifyProduct>> {
  const query = skus.map((s) => `sku:${s}`).join(" OR ");
  const data = await storefrontQuery<{
    products: { edges: Array<{ node: ShopifyProduct }> };
  }>(
    `query ValidateSkus($query: String!) {
      products(first: 50, query: $query) {
        edges { node { id handle title vendor variants(first: 10) {
          edges { node { id sku availableForSale price { amount currencyCode } } }
        } } }
      }
    }`,
    { query },
  );
  const result = new Map<string, ShopifyProduct>();
  for (const { node } of data.products.edges) {
    for (const variantEdge of node.variants.edges) {
      if (skus.includes(variantEdge.node.sku)) {
        result.set(variantEdge.node.sku, node);
      }
    }
  }
  return result;
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
