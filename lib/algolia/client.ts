// Algolia v5 search client for ACME B2B.
// Env: NEXT_PUBLIC_ALGOLIA_APP_ID, NEXT_PUBLIC_ALGOLIA_SEARCH_KEY.
// Indexing/writes are owned by the BigCommerce-native Algolia connector, so
// this module is read-only (search) and no admin key is used here.

import { algoliasearch } from "algoliasearch";

const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? "";
const SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY ?? "";

export const INDEX_PRODUCTS = "catalyst B2B demo";

// Browser-safe search client
export function getSearchClient() {
  return algoliasearch(APP_ID, SEARCH_KEY);
}

// Product search (for search page + autocomplete)
export async function searchProducts(query: string, options: { page?: number; hitsPerPage?: number; filters?: string } = {}) {
  if (!APP_ID || !SEARCH_KEY) return { hits: [], nbHits: 0, nbPages: 0 };
  const client = getSearchClient();
  const result = await client.searchSingleIndex({
    indexName: INDEX_PRODUCTS,
    searchParams: {
      query,
      hitsPerPage: options.hitsPerPage ?? 24,
      page: options.page ?? 0,
      filters: options.filters,
    },
  });
  return result;
}
