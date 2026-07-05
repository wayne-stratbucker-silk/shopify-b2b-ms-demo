import { notFound } from "next/navigation";
import Link from "next/link";
import { Page } from "@makeswift/runtime/next";
import { getSiteVersion } from "@makeswift/runtime/next/server";
import { client } from "@/lib/makeswift/client";
import { getCollectionMeta } from "@/lib/shopify/queries/products";
import { getContentPage } from "@/lib/shopify/pages";
import { ContentWithRegions } from "@/components/makeswift/content-regions";
import { fetchCollectionPLP } from "@/lib/algolia/collection-products";
import { FacetedPlp } from "@/components/faceted-plp";
import "@/components/makeswift/register";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ path: string[] }>;
}

export async function generateMetadata({ params }: Props) {
  const { path } = await params;
  const page = await getContentPage(path.join("/")).catch(() => null);
  if (!page) return {};
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || page.bodySummary || undefined,
  };
}

export default async function CatchAllPage({ params }: Props) {
  const { path } = await params;
  const slug = path.join("/");

  // 1. Try a fully Makeswift-built (standalone) page first.
  try {
    const snapshot = await client.getPageSnapshot(`/${slug}`, { siteVersion: getSiteVersion() });
    if (snapshot) return <Page snapshot={snapshot} />;
  } catch { /* fall through */ }

  // 2. Try a Shopify-authored content Page (Online Store → Pages). The body is
  //    sanitized Shopify HTML; any `[[makeswift-region:<id>]]` tokens in it
  //    become live, editable Makeswift content regions in place.
  const contentPage = await getContentPage(slug).catch(() => null);
  if (contentPage) {
    return (
      <div className="container section" style={{ maxWidth: 760 }}>
        <h1 className="text-h1" style={{ marginBottom: 16 }}>{contentPage.title}</h1>
        <ContentWithRegions html={contentPage.bodyHtml} />
      </div>
    );
  }

  // 3. Try as a collection handle (strip "collections/" prefix if present)
  const collectionHandle = slug.replace(/^collections\//, "");

  const [meta, plp] = await Promise.all([
    getCollectionMeta(collectionHandle).catch(() => null),
    fetchCollectionPLP(collectionHandle).catch(() => null),
  ]);

  if (meta) {
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

        {/* Faceted product grid */}
        <FacetedPlp
          listName={meta.title}
          filter={{ kind: "collection", collectionHandle }}
          initialProducts={plp?.products ?? []}
          initialFacets={plp?.facets}
          initialFacetDefs={plp?.facetDefs}
          initialNbHits={plp?.nbHits}
        />
      </div>
    );
  }

  return notFound();
}
