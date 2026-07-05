// Client-side page SEO / accessibility audit. Pure over a Document so it's
// testable and reusable. Powers the builder-time governance auditor.

export interface SeoIssue {
  severity: "error" | "warn";
  message: string;
}

export function auditDocument(doc: Document): SeoIssue[] {
  const issues: SeoIssue[] = [];

  // Images must declare an alt attribute (alt="" is allowed for decorative).
  const imgs = Array.from(doc.querySelectorAll("img"));
  const missingAlt = imgs.filter((i) => i.getAttribute("alt") == null);
  if (missingAlt.length) {
    issues.push({ severity: "error", message: `${missingAlt.length} image${missingAlt.length === 1 ? "" : "s"} missing an alt attribute` });
  }

  // Exactly one <h1>.
  const h1s = doc.querySelectorAll("h1");
  if (h1s.length === 0) issues.push({ severity: "error", message: "No <h1> heading on the page" });
  else if (h1s.length > 1) issues.push({ severity: "warn", message: `${h1s.length} <h1> headings — there should be exactly one` });

  // Meta description present + non-trivial.
  const desc = doc.querySelector('meta[name="description"]');
  const descContent = (desc?.getAttribute("content") ?? "").trim();
  if (!descContent) issues.push({ severity: "warn", message: "Missing meta description" });
  else if (descContent.length < 50) issues.push({ severity: "warn", message: "Meta description is very short (<50 chars)" });

  // Page title.
  const title = (doc.title ?? "").trim();
  if (title.length < 10) issues.push({ severity: "warn", message: "Page title is missing or very short" });

  // Links with no discernible text (icon-only without aria-label).
  const emptyLinks = Array.from(doc.querySelectorAll("a")).filter((a) => {
    const hasText = (a.textContent ?? "").trim().length > 0;
    const hasLabel = !!a.getAttribute("aria-label") || !!a.querySelector("[aria-label], img[alt]:not([alt=''])");
    return !hasText && !hasLabel;
  });
  if (emptyLinks.length) issues.push({ severity: "warn", message: `${emptyLinks.length} link${emptyLinks.length === 1 ? "" : "s"} without discernible text / aria-label` });

  return issues;
}

// The Makeswift Image control can return a URL string or an `{ url, dimensions }`
// object depending on how the value was saved. Normalize to a URL string — a
// pure local copy of the toUrl() shape used across the image components, kept
// here so this module stays React/DOM-free and unit-friendly.
function imageUrl(src: unknown): string | undefined {
  if (!src) return undefined;
  if (typeof src === "string") return src.trim() || undefined;
  if (typeof src === "object" && src !== null && "url" in src) {
    const url = (src as { url?: unknown }).url;
    return typeof url === "string" && url.trim() ? url : undefined;
  }
  return undefined;
}

/**
 * True when a content image needs alt text but has none: a real image is set, it
 * is not flagged decorative, and the alt is blank/whitespace. Binary by design —
 * the builder-only <AltTextNotice> renders whatever this returns.
 */
export function isAltMissing(src: unknown, alt?: string, decorative?: boolean): boolean {
  if (decorative) return false;
  if (!imageUrl(src)) return false;
  return !alt || alt.trim() === "";
}
