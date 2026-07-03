// Blog, backed by Shopify's native Online Store blog (Storefront API).
// Posts are authored in the Shopify admin (Online Store → Blog posts) — the
// Shopify-native CMS — replacing catalyst's BigCommerce blog.

import { storefrontQuery } from "@/lib/shopify/storefront-client";

const BLOG_HANDLE = process.env.NEXT_PUBLIC_BLOG_HANDLE || "news";

export interface ArticleSummary {
  handle: string;
  title: string;
  excerpt?: string;
  publishedAt: string;
  image?: { url: string; altText?: string | null };
  author?: string;
}

export interface Article extends ArticleSummary {
  contentHtml: string;
}

interface ArticleNode {
  handle: string;
  title: string;
  excerpt?: string | null;
  publishedAt: string;
  contentHtml?: string;
  image?: { url: string; altText?: string | null } | null;
  authorV2?: { name?: string | null } | null;
}

function toSummary(n: ArticleNode): ArticleSummary {
  return {
    handle: n.handle,
    title: n.title,
    excerpt: n.excerpt || undefined,
    publishedAt: n.publishedAt,
    image: n.image || undefined,
    author: n.authorV2?.name || undefined,
  };
}

export async function getBlogArticles(): Promise<ArticleSummary[]> {
  const data = await storefrontQuery<{ blog: { articles: { edges: Array<{ node: ArticleNode }> } } | null }>(
    `query BlogList($handle: String!) {
      blog(handle: $handle) {
        articles(first: 30, sortKey: PUBLISHED_AT, reverse: true) {
          edges { node { handle title excerpt publishedAt image { url altText } authorV2 { name } } }
        }
      }
    }`,
    { handle: BLOG_HANDLE },
  ).catch(() => ({ blog: null }));
  return (data.blog?.articles?.edges ?? []).map((e) => toSummary(e.node));
}

export async function getArticle(articleHandle: string): Promise<Article | null> {
  const data = await storefrontQuery<{ blog: { articleByHandle: ArticleNode | null } | null }>(
    `query Article($blogHandle: String!, $articleHandle: String!) {
      blog(handle: $blogHandle) {
        articleByHandle(handle: $articleHandle) {
          handle title publishedAt contentHtml image { url altText } authorV2 { name }
        }
      }
    }`,
    { blogHandle: BLOG_HANDLE, articleHandle },
  ).catch(() => ({ blog: null }));
  const a = data.blog?.articleByHandle;
  if (!a) return null;
  return { ...toSummary(a), contentHtml: a.contentHtml ?? "" };
}
