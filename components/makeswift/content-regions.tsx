// Inline Makeswift content regions inside Shopify-authored CMS content.
//
// This is the BC-accelerator "content region" pattern: an author drops a
// `[[makeswift-region:<id>]]` token anywhere in a Shopify Page or blog-post
// body, and that exact spot becomes a live, editable Makeswift region. The
// surrounding prose still renders as sanitized Shopify HTML; each token is
// replaced in place by a <MakeswiftComponent> a marketer designs in the
// builder by opening the page/post URL.
//
// Region IDs are author-chosen and GLOBAL: reuse the same id across pages to
// share one region everywhere it appears; use a unique id (e.g.
// `explainer-hero`) for a page-specific region.
//
// Server component (uses the Makeswift server client). Rendered from the
// storefront catch-all route and the blog article page — both server
// components.

import { MakeswiftComponent } from "@makeswift/runtime/next";
import { getSiteVersion } from "@makeswift/runtime/next/server";
import { client } from "@/lib/makeswift/client";
import { sanitizeBcHtml } from "@/lib/html/sanitize";
import "@/components/makeswift/page-content-region";

// `[[makeswift-region: my-id ]]` — whitespace-tolerant, id is [A-Za-z0-9_-]+.
const TOKEN_RE = /\[\[\s*makeswift-region\s*:\s*([A-Za-z0-9_-]+)\s*\]\]/gi;

// Shopify's rich-text editor wraps a lone token in its own <p>. Unwrap those so
// the region isn't bracketed by empty paragraphs; tokens sitting inline within
// other prose are left untouched.
const WRAPPED_TOKEN_RE = /<p[^>]*>\s*(\[\[\s*makeswift-region\s*:\s*[A-Za-z0-9_-]+\s*\]\])\s*<\/p>/gi;

// Spans covered by <pre>/<code>. Tokens inside these are teaching examples
// (an explainer showing the `[[makeswift-region:id]]` syntax) and must render
// as literal text, never become live regions.
function protectedRanges(html: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const re = /<(pre|code)\b[^>]*>[\s\S]*?<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) ranges.push([m.index, m.index + m[0].length]);
  return ranges;
}

function regionSnapshotId(regionId: string): string {
  return `acme-b2b-region-${regionId}`;
}

async function MakeswiftRegion({ regionId }: { regionId: string }) {
  const snapshot = await client.getComponentSnapshot(regionSnapshotId(regionId), {
    siteVersion: getSiteVersion(),
  });
  return (
    <MakeswiftComponent
      snapshot={snapshot}
      label={`Content Region: ${regionId}`}
      type="acme/page-content-region"
    />
  );
}

function HtmlChunk({ html }: { html: string }) {
  return (
    <div
      className="blog-content"
      style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink-2)" }}
      dangerouslySetInnerHTML={{ __html: sanitizeBcHtml(html) }}
    />
  );
}

/**
 * Render Shopify-authored HTML, replacing each `[[makeswift-region:<id>]]`
 * token with an editable Makeswift content region at that position. HTML
 * segments are sanitized; region hosts render no DOM of their own so dropped
 * components own their spacing/width.
 */
export function ContentWithRegions({ html }: { html: string }) {
  const normalized = html.replace(WRAPPED_TOKEN_RE, "$1");
  const ranges = protectedRanges(normalized);
  const isProtected = (idx: number) => ranges.some(([s, e]) => idx >= s && idx < e);

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_RE.exec(normalized)) !== null) {
    // Leave tokens inside code samples as literal text.
    if (isProtected(match.index)) continue;
    const before = normalized.slice(lastIndex, match.index);
    if (before.trim()) parts.push(<HtmlChunk key={`h${i}`} html={before} />);
    parts.push(<MakeswiftRegion key={`r${i}`} regionId={match[1].trim()} />);
    lastIndex = match.index + match[0].length;
    i++;
  }

  // No tokens at all → render the whole body as one sanitized chunk.
  if (parts.length === 0) return <HtmlChunk html={normalized} />;

  const rest = normalized.slice(lastIndex);
  if (rest.trim()) parts.push(<HtmlChunk key={`h${i}`} html={rest} />);

  return <>{parts}</>;
}
