import { notFound } from "next/navigation";
import Link from "next/link";
import { Page } from "@makeswift/runtime/next";
import { getSiteVersion } from "@makeswift/runtime/next/server";
import { client } from "@/lib/makeswift/client";
import { getContentPage } from "@/lib/shopify/pages";
import { ContentWithRegions } from "@/components/makeswift/content-regions";
import { getCollectionPlp, parsePlpFilters, parsePlpSort } from "@/lib/shopify/queries/plp";
import { ShopifyPlp } from "@/components/shopify-plp";
import "@/components/makeswift/register";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<{ filter?: string | string[]; sort?: string | string[] }>;
}

export async function generateMetadata({ params }: Props) {
  const { path } = await params;
  const page = await getContentPage(path.join("/").replace(/^pages\//, "")).catch(() => null);
  if (!page) return {};
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || page.bodySummary || undefined,
  };
}

export default async function CatchAllPage({ params, searchParams }: Props) {
  const { path } = await params;
  const slug = path.join("/");

  // 1. Try a fully Makeswift-built (standalone) page first.
  try {
    const snapshot = await client.getPageSnapshot(`/${slug}`, { siteVersion: getSiteVersion() });
    if (snapshot) return <Page snapshot={snapshot} />;
  } catch { /* fall through */ }

  // 2. Try a Shopify-authored content Page (Online Store → Pages), resolving
  //    both the bare handle and Shopify's native /pages/<handle> path. The body
  //    is sanitized Shopify HTML; `[[makeswift-region:<id>]]` tokens (outside
  //    code samples) become live, editable Makeswift content regions in place.
  const contentPage = await getContentPage(slug.replace(/^pages\//, "")).catch(() => null);
  if (contentPage) {
    return (
      <div className="container section" style={{ maxWidth: 760 }}>
        <h1 className="text-h1" style={{ marginBottom: 16 }}>{contentPage.title}</h1>
        <ContentWithRegions html={contentPage.bodyHtml} />
      </div>
    );
  }

  // 3. Try as a collection handle (strip "collections/" prefix if present).
  //    Products + facets come straight from the Storefront API — faceting and
  //    sorting are driven by the URL query string (see components/shopify-plp).
  const collectionHandle = slug.replace(/^collections\//, "");
  const sp = await searchParams;
  const plp = await getCollectionPlp(collectionHandle, {
    filters: parsePlpFilters(sp.filter),
    sort: parsePlpSort(sp.sort),
  }).catch(() => null);

  if (plp) {
    const meta = { title: plp.title ?? collectionHandle, description: plp.description };
    // Derive a readable parent name from the URL path when the collection is
    // nested (e.g. /electrical/wire-cable → parent = "Electrical").
    const parentSlug = path.length >= 2 ? path[0] : null;
    const parentName = parentSlug
      ? parentSlug.split("-").map((w) => (w[0] ?? "").toUpperCase() + w.slice(1)).join(" ")
      : null;

    return (
      <div className="container">
        {/* Breadcrumb */}
        <div className="crumbs" style={{ padding: "18px 0 0" }}>
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          {parentName && (
            <>
              <span style={{ color: "var(--ink-2)" }}>{parentName}</span>
              <span className="sep">/</span>
            </>
          )}
          <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>{meta.title}</span>
        </div>

        {/* Page heading */}
        <div className="page-h" style={{ marginTop: 12 }}>
          <div>
            <h1>{meta.title}</h1>
            {meta.description && (
              <p className="sub">{meta.description}</p>
            )}
          </div>
        </div>

        {/* Faceted product grid — Shopify-native facets + sort */}
        <ShopifyPlp
          listName={meta.title}
          mode="collection"
          products={plp.products}
          facets={plp.facets}
          totalCount={plp.pageInfo.hasNextPage ? undefined : plp.products.length}
          sort={parsePlpSort(sp.sort)}
        />
      </div>
    );
  }

  return notFound();
}
