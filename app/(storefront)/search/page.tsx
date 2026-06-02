import { SearchResults } from "./SearchResults";
import { fetchSearchPLP } from "@/lib/algolia/collection-products";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q: qRaw } = await searchParams;
  const q = qRaw?.trim() ?? "";
  const seed = await fetchSearchPLP(q).catch(() => ({ products: [], facets: {}, facetDefs: [], nbHits: 0 }));

  return <SearchResults initialQuery={q} initialProducts={seed.products} />;
}
