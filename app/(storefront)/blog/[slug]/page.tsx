import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getArticle } from "@/lib/blog";
import { sanitizeBcHtml } from "@/lib/html/sanitize";

export const dynamic = "force-dynamic";

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
  catch { return ""; }
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug).catch(() => null);
  return { title: article?.title ?? "Article" };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return notFound();

  return (
    <div className="container section" style={{ maxWidth: 760 }}>
      <Link href="/blog" className="text-sm" style={{ color: "var(--muted)" }}>← Resources &amp; News</Link>
      <h1 className="text-h1" style={{ marginTop: 12, marginBottom: 8 }}>{article.title}</h1>
      <div className="muted" style={{ fontSize: 13, marginBottom: 24 }}>
        {fmtDate(article.publishedAt)}{article.author ? ` · ${article.author}` : ""}
      </div>
      {article.image && (
        <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", marginBottom: 24, borderRadius: 8, overflow: "hidden", background: "var(--surface-2, #f6f7f9)" }}>
          <Image src={article.image.url} alt={article.image.altText ?? article.title} fill sizes="760px" style={{ objectFit: "cover" }} priority />
        </div>
      )}
      <div
        className="blog-content"
        style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-2)" }}
        dangerouslySetInnerHTML={{ __html: sanitizeBcHtml(article.contentHtml) }}
      />
    </div>
  );
}
