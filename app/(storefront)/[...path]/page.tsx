import { notFound } from "next/navigation";
import { Page } from "@makeswift/runtime/next";
import { getSiteVersion } from "@makeswift/runtime/next/server";
import { client } from "@/lib/makeswift/client";
import { getCollectionProducts } from "@/lib/shopify/queries/products";
import { mapProduct } from "@/lib/shopify/product-fetcher";
import { ProductCard } from "@/components/product-card";
import { getSession } from "@/lib/auth/session";
import type { BuyerContext } from "@/lib/shopify/storefront-client";
import "@/components/makeswift/register";

interface Props {
  params: Promise<{ path: string[] }>;
}

export default async function CatchAllPage({ params }: Props) {
  const { path } = await params;
  const slug = path.join("/");

  // 1. Try Makeswift page first
  try {
    const snapshot = await client.getPageSnapshot(`/${slug}`, { siteVersion: getSiteVersion() });
    if (snapshot) return <Page snapshot={snapshot} />;
  } catch { /* fall through */ }

  // 2. Try as a collection handle (strip "collections/" prefix if present)
  const collectionHandle = slug.replace(/^collections\//, "");

  const session = await getSession().catch(() => null);
  const buyer: BuyerContext | undefined = session?.companyLocationId
    ? { companyLocationId: session.companyLocationId }
    : undefined;

  const collection = await getCollectionProducts(collectionHandle, 24, undefined, buyer).catch(() => null);
  if (collection) {
    const products = collection.products.edges.map(e => mapProduct(e.node));
    return (
      <div>
        <section className="section-tight" style={{ background: "var(--bg-alt)", borderBottom: "1px solid var(--line)" }}>
          <div className="container">
            <h1 className="text-h1">{collection.title}</h1>
            {collection.description && (
              <p className="text-body" style={{ color: "var(--muted)", marginTop: 8 }}>{collection.description}</p>
            )}
          </div>
        </section>
        <section className="section">
          <div className="container">
            {products.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No products in this collection yet.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  return notFound();
}
