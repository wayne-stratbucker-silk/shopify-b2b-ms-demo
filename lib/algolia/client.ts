import { algoliasearch } from "algoliasearch";

const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID ?? "";
const SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY ?? "";

export const INDEX_PRODUCTS =
  process.env.NEXT_PUBLIC_ALGOLIA_INDEX_NAME ??
  process.env.ALGOLIA_INDEX_NAME ??
  "shopify_products";

export function getSearchClient() {
  return algoliasearch(APP_ID, SEARCH_KEY);
}
