import Link from "next/link";
import Image from "next/image";
import { getBlogArticles } from "@/lib/blog";

export const dynamic = "force-dynamic";

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
  catch { return ""; }
}

export const metadata = { title: "Resources & News" };

export default async function BlogPage() {
  const articles = await getBlogArticles();

  return (
    <div className="container section">
      <h1 className="text-h1" style={{ marginBottom: 8 }}>Resources &amp; News</h1>
      <p style={{ color: "var(--muted)", marginBottom: 32 }}>Product guides, industry updates and how-tos for our trade partners.</p>

      {articles.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No posts yet. Articles authored in Shopify (Online Store → Blog posts) appear here.
        </div>
      ) : (
        <div className="g3">
          {articles.map((a) => (
            <Link key={a.handle} href={`/blog/${a.handle}`} className="card" style={{ textDecoration: "none", color: "inherit", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {a.image && (
                <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "var(--surface-2, #f6f7f9)" }}>
                  <Image src={a.image.url} alt={a.image.altText ?? a.title} fill sizes="(max-width: 768px) 100vw, 360px" style={{ objectFit: "cover" }} />
                </div>
              )}
              <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  {fmtDate(a.publishedAt)}{a.author ? ` · ${a.author}` : ""}
                </div>
                <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{a.title}</div>
                {a.excerpt && <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>{a.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
