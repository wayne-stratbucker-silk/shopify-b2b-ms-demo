// HTML sanitization for content authored in the BigCommerce admin and
// rendered into the storefront via dangerouslySetInnerHTML (product
// descriptions, "about" copy, category descriptions).
//
// The source is admin-controlled in BC today, so the immediate XSS risk is
// low. The reason this exists is the lateral-movement path: if any of (a) a
// BC store-admin account is compromised, (b) the BC Management API token
// leaks and an attacker patches a product description, the storefront
// becomes a stored-XSS vector — and the injected script runs same-origin
// with access to acme_session-cookie-credentialed fetches.
//
// We use `sanitize-html` instead of DOMPurify/isomorphic-dompurify because:
//   - It is pure server-side, sync, no jsdom dependency. DOMPurify needs
//     jsdom on the server, and jsdom's transitive deps include ESM-only
//     packages that Vercel's Node 24 serverless runtime can't `require()`
//     — every PLP/PDP page that imported sanitize would 500 at module
//     load.
//   - We only call sanitize from Server Components (the parent of any
//     dangerouslySetInnerHTML site), so cross-runtime isomorphism is not
//     a requirement.
//
// The allowlist is intentionally tight — what a BC merchandiser actually
// uses for product copy (text, basic formatting, lists, links, headings,
// images, tables). Expand only with a documented reason.

import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u",
    "ul", "ol", "li",
    "a",
    "h2", "h3", "h4", "h5", "h6",
    "img",
    "table", "thead", "tbody", "tfoot", "tr", "td", "th",
    "span", "div",
    "blockquote",
    "code", "pre",
    "hr",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    "*": [],
  },
  // Drop anything not on the list silently (the default; explicit for
  // readability).
  disallowedTagsMode: "discard",
  // Allow http/https/mailto/tel; explicitly block javascript:/data: URLs
  // even though sanitize-html would drop them by default.
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: {
    img: ["http", "https"],
  },
  // No data attributes (no `data-*`).
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  // Force target="_blank" links to add rel="noopener noreferrer" so a
  // hijacked product description can't pivot via window.opener.
  transformTags: {
    a: (tagName, attribs) => {
      if (attribs.target === "_blank") {
        const existingRel = attribs.rel ?? "";
        const needed = ["noopener", "noreferrer"];
        const merged = [
          ...existingRel.split(/\s+/).filter(Boolean),
          ...needed.filter((r) => !existingRel.includes(r)),
        ].join(" ");
        return { tagName: "a", attribs: { ...attribs, rel: merged } };
      }
      return { tagName, attribs };
    },
  },
};

/**
 * Conservative fallback when sanitize-html itself throws. Strips every
 * angle-bracketed token so no markup at all renders — safer than 500-ing
 * the request. Loses formatting, preserves text, never XSS.
 */
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize a BigCommerce-sourced HTML string for safe rendering via
 * `dangerouslySetInnerHTML`. Always run this on the server before the
 * markup reaches the client bundle.
 *
 * Defensive: any failure inside sanitize-html falls back to stripping all
 * tags. The security goal is "no script execution"; tag-stripping
 * accomplishes that, and rendering plain text is strictly better than
 * 500-ing a public PLP.
 */
export function sanitizeBcHtml(html: string | null | undefined): string {
  if (!html) return "";
  try {
    return sanitizeHtml(html, OPTIONS);
  } catch (err) {
    console.error("[sanitize] sanitize-html failed, falling back to tag-strip:", err);
    return stripTags(html);
  }
}
