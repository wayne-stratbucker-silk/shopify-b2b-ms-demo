import { Page } from "@makeswift/runtime/next";
import { getSiteVersion } from "@makeswift/runtime/next/server";
import { client } from "@/lib/makeswift/client";
import { getFeaturedProducts } from "@/lib/shopify/queries/products";
import { getCollections } from "@/lib/shopify/queries/products";
import { mapProduct } from "@/lib/shopify/product-fetcher";
import { ProductCard } from "@/components/product-card";
import { getSession } from "@/lib/auth/session";
import type { BuyerContext } from "@/lib/shopify/storefront-client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Try Makeswift page first
  try {
    const snapshot = await client.getPageSnapshot("/", { siteVersion: getSiteVersion() });
    if (snapshot) {
      return (
        <div style={{ background: "var(--bg-alt)" }}>
          <Page snapshot={snapshot} />
        </div>
      );
    }
  } catch { /* fall through to default */ }

  const session = await getSession().catch(() => null);
  const buyer: BuyerContext | undefined = session?.companyLocationId
    ? { companyLocationId: session.companyLocationId }
    : undefined;

  const [featured, collections] = await Promise.all([
    getFeaturedProducts(8, buyer).catch(() => []),
    getCollections(6).catch(() => []),
  ]);

  return (
    <div style={{ background: "var(--bg-alt)" }}>
      {/* Hero */}
      <section className="section" style={{ background: "var(--primary)", color: "#fff", textAlign: "center" }}>
        <div className="container">
          <h1 className="text-h0" style={{ color: "#fff", marginBottom: 16 }}>
            Commercial Electrical & Lighting Supply
          </h1>
          <p style={{ fontSize: 18, opacity: 0.85, marginBottom: 32 }}>
            Net 30 terms · Same-day ship · Tiered B2B pricing
          </p>
          <a href="/collections/wire-cable" className="btn btn-lg" style={{ background: "#fff", color: "var(--primary)" }}>
            Shop Now
          </a>
        </div>
      </section>

      {/* Categories */}
      {collections.length > 0 && (
        <section className="section">
          <div className="container">
            <h2 className="text-h2" style={{ marginBottom: 24 }}>Shop by Category</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {collections.map(col => (
                <a key={col.handle} href={`/collections/${col.handle}`} className="card card-h" style={{ padding: 20, textAlign: "center" }}>
                  <div className="text-h4" style={{ fontWeight: 600 }}>{col.title}</div>
                  {col.description && <p className="text-sm" style={{ color: "var(--muted)", marginTop: 4 }}>{col.description}</p>}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="section" style={{ background: "var(--surface)" }}>
          <div className="container">
            <h2 className="text-h2" style={{ marginBottom: 24 }}>Featured Products</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              {featured.map(p => <ProductCard key={p.id} product={mapProduct(p)} />)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
