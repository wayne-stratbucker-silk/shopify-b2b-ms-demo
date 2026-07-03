import Link from "next/link";
import { draftMode } from "next/headers";
import { MakeswiftComponent } from "@makeswift/runtime/next";
import { getSiteVersion } from "@makeswift/runtime/next/server";
import { ProductCard } from "@/components/product-card";
import { Icon } from "@/components/ui/icons";
import { sanitizeBcHtml } from "@/lib/html/sanitize";
import { VariantSelector } from "@/components/variant-selector";
import { ProductTabs } from "@/components/product-tabs";
import { ImageGallery } from "@/components/image-gallery";
import { PdpContactCard } from "@/components/pdp-contact-card";
// BC types stubbed out for Shopify compatibility
type BCMgmtVariant = { id: number; sku: string; price?: number; inventory_level?: number; upc?: string; mpn?: string; option_values: Array<{ option_id: number; id: number; option_display_name: string; label: string }> };
type ProductOptionConfig = { displayName: string; optionId: number; displayStyle?: string; values: Array<{ label: string; isDefault: boolean; id: number }> };
async function fetchRelatedProducts(_p: unknown, _s: unknown): Promise<unknown[]> { return []; }
async function fetchProductReviewCount(_id: string): Promise<number> { return 0; }
import { getSession } from "@/lib/auth/session";
import { getSalesRep } from "@/lib/b2b/sales-rep";
import { client } from "@/lib/makeswift/client";
import type { Product } from "@/types";

// Register the globally-linked PDP content region wrapper so the server
// snapshot below renders its dropped components.
import "@/components/makeswift/pdp-content-region";
// Register the globally-linked PDP trust badges so the buy-box snapshot renders.
import "@/components/makeswift/pdp-trust-badges";
// Register the globally-linked PDP freight note shown in the Availability box.
import "@/components/makeswift/pdp-freight-note";

export interface PDPResult {
  product: Product;
  variants: BCMgmtVariant[];
  optionConfig?: ProductOptionConfig[];
  rawId: number;
  relatedProductIds: number[];
}

// Stable ID for the globally-shared PDP content region — same snapshot
// renders on every PDP between the spec/description tabs and related products.
const PDP_CONTENT_REGION_ID = "acme-b2b-pdp-content-region";

// True when the content region's Slot has at least one dropped component.
// The root element's Slot prop serializes to `{ elements: ElementData[], ... }`;
// an empty region has `elements: []`. We scan all props defensively so a future
// prop rename doesn't silently break the check, and treat the fallback document
// (data === null) as empty.
function regionHasContent(
  snapshot: Awaited<ReturnType<typeof client.getComponentSnapshot>>,
): boolean {
  const data = snapshot?.document?.data as { props?: Record<string, unknown> } | null | undefined;
  if (!data || typeof data !== "object") return false;
  return Object.values(data.props ?? {}).some((value) => {
    const elements = (value as { elements?: unknown[] } | null)?.elements;
    return Array.isArray(elements) && elements.length > 0;
  });
}

async function PdpContentRegionSlot() {
  const snapshot = await client.getComponentSnapshot(PDP_CONTENT_REGION_ID, {
    siteVersion: getSiteVersion(),
  });

  // Hide the region entirely on the live site when no components have been
  // dropped in — otherwise Makeswift renders an empty placeholder box between
  // the spec table and related products. Inside the Makeswift builder (draft
  // mode) we always render it so admins can drop the first component.
  const { isEnabled: inBuilder } = await draftMode();
  if (!inBuilder && !regionHasContent(snapshot)) return null;

  return (
    <MakeswiftComponent
      snapshot={snapshot}
      label="PDP Content Region"
      type="acme/pdp-content-region"
    />
  );
}

// Stable ID for the globally-shared PDP trust badges — same snapshot renders in
// every PDP buy box. Unlike the content region this always renders: the
// component ships default badges, so the live site shows them before any edit.
const PDP_TRUST_BADGES_ID = "acme-b2b-pdp-trust-badges";

async function PdpTrustBadgesSlot() {
  const snapshot = await client.getComponentSnapshot(PDP_TRUST_BADGES_ID, {
    siteVersion: getSiteVersion(),
  });

  return (
    <MakeswiftComponent
      snapshot={snapshot}
      label="PDP Trust Badges"
      type="acme/pdp-trust-badges"
    />
  );
}

// Stable ID for the globally-shared freight note shown in every PDP's
// Availability box. Rendered server-side here and threaded down to the buy box
// (a client component) as a prop. Always renders — the component ships default
// copy, so the live site shows it before any edit.
const PDP_FREIGHT_NOTE_ID = "acme-b2b-pdp-freight-note";

async function PdpFreightNoteSlot() {
  const snapshot = await client.getComponentSnapshot(PDP_FREIGHT_NOTE_ID, {
    siteVersion: getSiteVersion(),
  });

  return (
    <MakeswiftComponent
      snapshot={snapshot}
      label="PDP Freight Note"
      type="acme/pdp-freight-note"
    />
  );
}

// ─── Main PDP page ────────────────────────────────────────────────────────────

export async function PDPPage({ result }: { result: PDPResult }) {
  const { product, variants, optionConfig, rawId, relatedProductIds: _relatedProductIds } = result;

  const session = await getSession();
  const isLoggedIn = !!session;
  const salesRep = await getSalesRep(session?.companyId);

  const catSlug = product.category
    .toLowerCase()
    .replace(/\s+&\s+/g, "-")
    .replace(/\s+/g, "-");

  const [related, reviewCount] = await Promise.all([
    fetchRelatedProducts(rawId, catSlug),
    fetchProductReviewCount(String(rawId)),
  ]);

  const aboutHtml = product.warranty;

  // Merge WebDAV URL metafields (specSheetUrl / installGuideUrl / cadFileUrl)
  // into the documents list shown on the PDP. These are plain URLs hosted on
  // BigCommerce WebDAV (no signed URLs).
  // See: https://support.bigcommerce.com/s/article/File-Access-WebDAV
  const extraDocs: { name: string; url: string; filename: string; size: string }[] = [];
  for (const [label, url] of [
    ["Spec sheet", product.specSheetUrl],
    ["Installation guide", product.installGuideUrl],
    ["CAD file", product.cadFileUrl],
  ] as const) {
    if (!url) continue;
    const filename = url.split("/").pop() ?? "";
    if (product.documents?.some((d) => d.url === url || d.filename === filename)) continue;
    extraDocs.push({ name: label, url, filename, size: "" });
  }
  const allDocs = [...(product.documents ?? []), ...extraDocs];

  // Map each variant's option-value label → variant SKU so the (read-only)
  // variant selector's pressed-button label can be resolved to a SKU inside
  // the gallery, which drives the variant-image swap (alt text encodes the
  // SKU). Single-option variants render the first option value as the button
  // label, matching how VariantSelector builds its buttons.
  const variantLabelToSku: Record<string, string> = {};
  for (const v of variants) {
    const label = v.option_values?.[0]?.label;
    if (label && v.sku) variantLabelToSku[label] = v.sku;
  }

  return (
    <div className="container" style={{ paddingTop: 20, paddingBottom: 80 }}>
      {/* ─── BREADCRUMBS ─── */}
      <div className="crumbs pdp-crumbs" style={{ marginBottom: 20 }}>
        <Link href="/">Home</Link>
        <span className="sep">/</span>
        <Link href={`/category/${catSlug}`}>{product.category}</Link>
        <span className="sep">/</span>
        <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>{product.name}</span>
      </div>

      {/* ─── TWO-COL LAYOUT ─── */}
      {/* Desktop: left column = gallery + docs stacked (independent of buy-box height); */}
      {/* right column = buy box. On mobile (≤768px) .pdp-left uses display:contents so */}
      {/* gallery/docs join the buy box in one flow, then `order` yields gallery → buy box → docs. */}
      <div className="pdp-layout" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", columnGap: 56, rowGap: 24, alignItems: "start" }}>

        {/* ── Left column: gallery + docs ── */}
        <div className="pdp-left">
          {/* ── Gallery ── */}
          <ImageGallery
            galleryImages={product.galleryImages}
            videos={product.videos}
            name={product.name}
            variantLabelToSku={variantLabelToSku}
          />

          {/* ── Docs card (stacked under gallery in the left column on desktop) ── */}
          {allDocs.length > 0 && (
            <div className="card pdp-docs">
              <div className="card-h">
                <h3>
                  <Icon name="doc" size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                  Resources &amp; spec docs
                </h3>
              </div>
              <div>
                {allDocs.map((doc, i) => (
                  <div
                    key={doc.url || doc.filename || i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 20px",
                      borderBottom: i < allDocs.length - 1 ? "1px solid var(--line)" : "none",
                    }}
                  >
                    <Icon name="doc" size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{doc.name}</div>
                      <div className="mono muted" style={{ fontSize: 11, marginTop: 1 }}>
                        {doc.filename}{doc.size ? ` · ${doc.size}` : ""}
                      </div>
                    </div>
                    <a
                      href={doc.url}
                      download={doc.filename || undefined}
                      className="btn btn-ghost btn-sm"
                      aria-label={`Download ${doc.filename || doc.name}`}
                      style={{ flexShrink: 0 }}
                    >
                      <Icon name="download" size={13} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Buy box (right column) ── */}
        <div className="col pdp-buybox" style={{ gap: 18 }}>
          <VariantSelector baseProduct={product} variants={variants} optionConfig={optionConfig} isLoggedIn={isLoggedIn} productName={product.name} freightNote={<PdpFreightNoteSlot />} />

          {/* Globally-linked Makeswift trust badges — merchandisers edit the
              icon/title/subtitle and add/remove rows in the builder. Ships
              default badges so the live site renders before any edit. */}
          <PdpTrustBadgesSlot />
        </div>
      </div>

      {/* ─── TABS + ASIDE ─── */}
      <div className="pdp-lower" style={{ marginTop: 48, display: "grid", gridTemplateColumns: "1fr 280px", gap: 40, alignItems: "start" }}>
        <div>
          <ProductTabs
            specs={product.specs}
            description={sanitizeBcHtml(product.description)}
            reviewCount={reviewCount}
          />

          {/* Globally-linked Makeswift region — admins drop any registered
              components here; collapses to nothing when empty. */}
          <PdpContentRegionSlot />

          {related.length > 0 && (
            <div style={{ marginTop: 56 }}>
              <div className="h-row">
                <div>
                  <p className="eyebrow">Related</p>
                  <h2>More in {product.category}</h2>
                </div>
                <Link href={`/category/${catSlug}`} className="btn btn-ghost btn-sm">
                  View all <Icon name="arrow" size={14} />
                </Link>
              </div>
              <div className="g4 pdp-related-grid" style={{ gap: 20 }}>
                {(related as Product[]).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="pdp-aside" style={{ position: "sticky", top: 80 }}>
          {aboutHtml ? (
            <div className="card">
              <div className="card-h"><h3>About this product</h3></div>
              <div
                className="card-b"
                style={{ fontSize: 13, lineHeight: 1.65, color: "var(--ink-2)" }}
                dangerouslySetInnerHTML={{ __html: sanitizeBcHtml(aboutHtml) }}
              />
            </div>
          ) : (
            <PdpContactCard salesRep={salesRep} />
          )}
        </aside>
      </div>
    </div>
  );
}
