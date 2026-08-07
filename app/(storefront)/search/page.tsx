import { ShopifyPlp } from "@/components/shopify-plp";
import { getSearchPlp, parsePlpFilters, parsePlpSort } from "@/lib/shopify/queries/plp";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ q?: string; filter?: string | string[]; sort?: string | string[] }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";
  const sort = parsePlpSort(sp.sort);

  const plp = await getSearchPlp(q, {
    filters: parsePlpFilters(sp.filter),
    sort,
  }).catch(() => ({ products: [], facets: [], pageInfo: { hasNextPage: false, endCursor: null }, totalCount: 0 }));

  const count = plp.totalCount ?? plp.products.length;

  return (
    <div className="container" style={{ padding: "24px 0 48px" }}>
      <div className="crumbs" style={{ padding: "0 0 12px" }}>
        <span style={{ color: "var(--muted)" }}>Search results</span>
      </div>
      <div className="page-h" style={{ marginBottom: 8 }}>
        <div>
          <h1>{q ? `Results for "${q}"` : "Search"}</h1>
          <p className="sub">
            {q ? (
              <>
                <strong style={{ color: "var(--ink)" }}>{count.toLocaleString()}</strong>{" "}
                product{count !== 1 ? "s" : ""}
              </>
            ) : (
              "Search by SKU, MPN, or keyword above."
            )}
          </p>
        </div>
      </div>

      {q ? (
        <ShopifyPlp
          listName="Search Results"
          mode="search"
          products={plp.products}
          facets={plp.facets}
          totalCount={count}
          sort={sort}
          emptyTitle="No products found"
          emptyHint="Try a different keyword or check your spelling."
        />
      ) : null}
    </div>
  );
}
