/**
 * Algolia Product Sync — Shopify → Algolia
 *
 * Paginates all Shopify products and upserts them to Algolia.
 * Run: npm run algolia-sync
 */

import "dotenv/config";
import { algoliasearch } from "algoliasearch";
import { getAdminToken } from "../lib/shopify/admin-token";

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const ADMIN_TOKEN = await getAdminToken();
const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!;
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY!;
const INDEX_NAME = process.env.ALGOLIA_INDEX_NAME ?? "shopify-b2b-demo";
const API_VERSION = "2026-07";

if (!ADMIN_TOKEN || !ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
  console.error("❌ Missing required env vars: SHOPIFY_ADMIN_API_TOKEN, NEXT_PUBLIC_ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY");
  process.exit(1);
}

const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

interface AlgoliaRecord {
  objectID: string;
  handle: string;
  name: string;
  sku: string;
  brand: string;
  price: number;
  compareAtPrice?: number;
  imageUrl?: string;
  category: string;       // first collection handle (kept for backward compat)
  collections: string[];  // all collection handles
  inStock: boolean;
  totalInventory: number;
  uom: string;
  tags: string[];
}

interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  tags: string[];
  featuredImage?: { url: string };
  collections: { edges: Array<{ node: { handle: string } }> };
  variants: {
    edges: Array<{
      node: {
        sku: string;
        price: string;
        compareAtPrice?: string;
        availableForSale: boolean;
        inventoryQuantity?: number;
      };
    }>;
  };
  metafields: Array<{ key: string; value: string } | null>;
}

async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  let cursor: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(
      `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": ADMIN_TOKEN,
        },
        body: JSON.stringify({
          query: `
            query GetProducts($first: Int!, $after: String) {
              products(first: $first, after: $after, sortKey: ID) {
                edges {
                  cursor
                  node {
                    id handle title vendor tags
                    featuredImage { url }
                    collections(first: 50) { edges { node { handle } } }
                    variants(first: 5) {
                      edges {
                        node {
                          sku price compareAtPrice availableForSale
                          inventoryQuantity
                        }
                      }
                    }
                    metafields(identifiers: [{ namespace: "custom", key: "uom" }]) {
                      key value
                    }
                  }
                }
                pageInfo { hasNextPage }
              }
            }
          `,
          variables: { first: 100, after: cursor },
        }),
      }
    );

    const json = await res.json() as {
      data: {
        products: {
          edges: Array<{ cursor: string; node: ShopifyProduct }>;
          pageInfo: { hasNextPage: boolean };
        };
      };
    };

    const edges = json.data.products.edges;
    products.push(...edges.map(e => e.node));
    hasMore = json.data.products.pageInfo.hasNextPage;
    cursor = edges[edges.length - 1]?.cursor ?? null;

    console.log(`  Fetched ${products.length} products...`);
  }

  return products;
}

function toAlgoliaRecord(product: ShopifyProduct): AlgoliaRecord {
  const defaultVariant = product.variants.edges[0]?.node;
  const collectionHandles = product.collections.edges.map(e => e.node.handle);
  const category = collectionHandles[0] ?? "uncategorized";
  const totalInventory = product.variants.edges.reduce(
    (sum, e) => sum + (e.node.inventoryQuantity ?? 0),
    0
  );
  const uom = (product.metafields ?? []).filter(Boolean).find(m => m!.key === "uom")?.value ?? "EA";

  return {
    objectID: product.id,
    handle: product.handle,
    name: product.title,
    sku: defaultVariant?.sku ?? product.handle,
    brand: product.vendor,
    price: parseFloat(defaultVariant?.price ?? "0"),
    compareAtPrice: defaultVariant?.compareAtPrice ? parseFloat(defaultVariant.compareAtPrice) : undefined,
    imageUrl: product.featuredImage?.url,
    category,
    collections: collectionHandles,
    inStock: product.variants.edges.some(e => e.node.availableForSale),
    totalInventory,
    uom,
    tags: product.tags,
  };
}

async function main() {
  console.log(`🔄 Syncing Shopify products to Algolia index: ${INDEX_NAME}`);

  // Configure index settings so facets are searchable and orderable
  await client.setSettings({
    indexName: INDEX_NAME,
    indexSettings: {
      searchableAttributes: ["name", "sku", "brand", "tags"],
      attributesForFaceting: [
        "searchable(brand)",
        "filterOnly(category)",
        "filterOnly(collections)",
        "filterOnly(inStock)",
        "tags",
        "uom",
      ],
      customRanking: ["desc(totalInventory)"],
    },
  });
  console.log("✓ Index settings configured");

  const products = await fetchAllProducts();
  console.log(`\n✓ Fetched ${products.length} products from Shopify`);

  const records = products.map(toAlgoliaRecord);

  await client.saveObjects({ indexName: INDEX_NAME, objects: records });
  console.log(`✅ Synced ${records.length} records to Algolia`);
}

main().catch(err => { console.error("❌ Sync failed:", err); process.exit(1); });
