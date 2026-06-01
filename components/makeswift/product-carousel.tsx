/**
 * Makeswift product picker / carousel.
 *
 * Rules enforced by the product-data-standardization spec:
 *  - The product picker MUST show ONLY product identity (id, name, image,
 *    sku, price). Live inventory is never fetched inside the visual editor.
 *  - The picker MUST NOT call Algolia with the admin key. SKU lookup is done
 *    via the BigCommerce GraphQL/REST APIs only.
 *
 * Runtime rendering still pulls more fields via /api/bc/products (badges,
 * price ranges) — that's a public read path. The picker-only endpoint at
 * /api/bc/product-picker returns a strict identity-only shape and is what
 * a future Makeswift custom picker UI must call.
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput, List, Shape, Select, Checkbox, Link } from "@makeswift/runtime/controls";
import { ProductPH } from "@/components/ui/product-placeholder";
import { Badge } from "@/components/ui/badge";
import { StockPill } from "@/components/ui/stock-pill";
import type { BadgeKind } from "@/types";
import { partitionFinished, variantSkusFor } from "@/lib/makeswift/finished-sku";
import { FinishedSkuNotice, type UnfinishedSkuInfo } from "@/components/makeswift/finished-sku-notice";
import { MSImage } from "@/components/makeswift/ms-image";
import { ctaClass, type CtaStyle } from "@/lib/makeswift/cta-class";
import { linkProps, hasLink, type MSLink } from "@/lib/makeswift/link";

interface BCProduct {
  sku: string;
  name: string;
  brand?: string;
  price: string;
  unitPriceRaw?: number;
  listPriceRaw?: number;
  stock?: number;
  stockQty?: number;
  lowStockLevel?: number;
  trackInventory?: boolean;
  badges?: string[];
  imageUrl?: string;
  path?: string;
  // Present only when the entered SKU is a PARENT product with variants —
  // i.e. not a finished SKU. Used to filter these out of the carousel.
  variants?: Array<{ sku: string; label?: string }>;
}

const DEFAULT_SKUS = [
  "LH-2X4-40LM-35K",
  "CR-HB-200W-50K",
  "PH-A19-9W-27K",
  "LU-MAES-DV-WH",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProductCarousel(props: any) {
  const {
    eyebrow, heading, subheading,
    viewAllLink, viewAllLabel, viewAllStyle,
    skus: skusProp, cols,
    showDivider,
    className,
  } = props as {
    eyebrow?: string;
    heading?: string;
    subheading?: string;
    viewAllLink?: MSLink;
    viewAllLabel?: string;
    viewAllStyle?: CtaStyle;
    skus?: Array<{ sku?: string; link?: MSLink }>;
    cols?: string;
    showDivider?: boolean;
    className?: string;
  };

  const [products, setProducts] = useState<BCProduct[]>([]);
  const [unfinished, setUnfinished] = useState<UnfinishedSkuInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const selectedSkus = skusProp?.length
    ? skusProp.map((s) => s.sku ?? "").filter(Boolean)
    : DEFAULT_SKUS;

  const linkOverrides: Record<string, MSLink | undefined> = Object.fromEntries(
    (skusProp ?? []).map((s) => [s.sku ?? "", s.link])
  );

  useEffect(() => {
    if (!selectedSkus.length) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/bc/products?skus=${encodeURIComponent(selectedSkus.join(","))}`)
      .then((r) => r.json())
      .then((data: { products?: BCProduct[] }) => {
        // Only finished SKUs render. A parent SKU of a variant product comes
        // back with a populated `variants` array — drop it and surface it in
        // the builder so the admin enters a specific variant SKU instead.
        const { finished, unfinished } = partitionFinished(data.products ?? []);
        setProducts(finished);
        setUnfinished(
          unfinished.map((p) => ({ sku: p.sku, variantSkus: variantSkusFor(p) })),
        );
        if (unfinished.length) {
          console.warn(
            "[product-carousel] Ignoring parent SKUs with variants (enter a variant SKU):",
            unfinished.map((p) => p.sku).join(", "),
          );
        }
      })
      .catch(() => { setProducts([]); setUnfinished([]); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSkus.join(",")]);

  const colCount = parseInt(cols ?? "4", 10);

  const displayItems: BCProduct[] = loading
    ? selectedSkus.map((sku) => ({ sku, name: "", price: "" }))
    : products;

  const needsCarousel = displayItems.length > colCount;

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 1);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => el.removeEventListener("scroll", updateScrollState);
  }, [displayItems, updateScrollState]);

  function scrollCarousel(dir: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    // Use the measured first-card width so snap-aligned scrolling lands on a
    // card boundary even when responsive CSS overrides the inline width.
    const firstCard = el.querySelector<HTMLElement>(".carousel-slide");
    const cardWidth = firstCard?.getBoundingClientRect().width ?? el.scrollWidth / displayItems.length;
    const gap = 20;
    el.scrollBy({ left: dir * (cardWidth + gap) * colCount, behavior: "smooth" });
  }

  return (
    <section
      className={`acme-product-carousel ${className ?? ""}`}
      style={{ borderTop: showDivider ? "1px solid var(--line)" : undefined }}
    >
      <div className="container">
        <div className="h-row">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {heading && (
              <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.015em", margin: "6px 0 0" }}>
                {heading}
              </h2>
            )}
            {subheading && <p style={{ color: "var(--muted)", margin: "4px 0 0", fontSize: 13 }}>{subheading}</p>}
          </div>
          <div className="acme-product-carousel-actions">
            {needsCarousel && (
              <div className="acme-product-carousel-controls">
                <button
                  className="btn btn-ghost btn-sm"
                  aria-label="Previous"
                  type="button"
                  disabled={!canPrev}
                  onClick={() => scrollCarousel(-1)}
                  style={{ opacity: canPrev ? 1 : 0.35 }}
                >←</button>
                <button
                  className="btn btn-ghost btn-sm"
                  aria-label="Next"
                  type="button"
                  disabled={!canNext}
                  onClick={() => scrollCarousel(1)}
                  style={{ opacity: canNext ? 1 : 0.35 }}
                >→</button>
              </div>
            )}
            {hasLink(viewAllLink) && (
              <a {...linkProps(viewAllLink)} className={ctaClass(viewAllStyle, "secondary", "btn-sm")}>{viewAllLabel ?? "View all"}</a>
            )}
          </div>
        </div>

        <FinishedSkuNotice items={unfinished} />

        <div
          ref={trackRef}
          className="carousel-track acme-product-carousel-track"
          data-cols={colCount}
        >
          {displayItems.map((item, i) => {
            // Per-SKU override wins ONLY when actually configured — an unset
            // Makeswift Link control resolves to `{ href: '#' }`, which would
            // otherwise shadow the BC product path and break PDP linking.
            const override = linkOverrides[item.sku];
            const overrideSet = hasLink(override);
            return (
            <a
              key={`${item.sku}-${i}`}
              href={overrideSet ? override!.href : item.path || "#"}
              target={overrideSet ? override!.target : undefined}
              className="pcard carousel-slide acme-product-card"
              style={{
                textDecoration: "none",
                opacity: loading ? 0.5 : 1,
                transition: "opacity .2s",
                // Desktop width — mobile override happens via CSS on
                // `.acme-product-carousel-track[data-cols]`.
                width: `calc((100% - ${(colCount - 1) * 20}px) / ${colCount})`,
              }}
            >
              <div className="img-wrap">
                {item.imageUrl ? (
                  <MSImage
                    src={item.imageUrl}
                    alt={item.name || item.sku || ""}
                    sizes="(max-width:480px) 50vw, (max-width:768px) 40vw, 25vw"
                    priority={i < 2}
                    objectFit="cover"
                    quality={70}
                  />
                ) : (
                  <ProductPH
                    label={(item.sku ?? "SKU").split("-").slice(0, 2).join("-")}
                    style={{ width: "100%", height: "100%" }}
                  />
                )}
                {item.badges && item.badges.length > 0 && (
                  <div className="img-badges">
                    {item.badges.map((b) => (
                      <Badge key={b} kind={b as BadgeKind} />
                    ))}
                  </div>
                )}
                {!loading && (
                  <div className="img-stock-pill">
                    <StockPill
                      stockQty={item.stockQty ?? item.stock ?? 0}
                      lowStockLevel={item.lowStockLevel}
                      trackInventory={item.trackInventory}
                    />
                  </div>
                )}
              </div>
              <div className="card-body">
                <div className="sku">
                  {item.sku}{item.brand ? ` · ${item.brand}` : ""}
                </div>
                <div className="name">
                  {item.name || <span style={{ color: "var(--muted-2)" }}>Loading…</span>}
                </div>
                <div className="card-foot">
                  <div className="price-row">
                    <div className="price">
                      ${(item.unitPriceRaw ?? 0).toFixed(2)}
                      <small style={{ fontSize: 11, fontWeight: 400, color: "var(--muted)", marginLeft: 4 }}>
                        /ea
                      </small>
                    </div>
                    {(item.listPriceRaw ?? item.unitPriceRaw) != null && (
                      <span className="list-price" style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-geist-mono, monospace)" }}>
                        List ${(item.listPriceRaw ?? item.unitPriceRaw ?? 0).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

runtime.registerComponent(ProductCarousel, {
  type: "acme-product-carousel",
  label: "Products & Ordering / Product Carousel",
  props: {
    className: Style(),
    eyebrow: TextInput({ label: "Eyebrow", defaultValue: "Featured · Spring releases" }),
    heading: TextInput({ label: "Heading", defaultValue: "New from Lithonia, Cree & Lutron" }),
    subheading: TextInput({ label: "Subheading" }),
    viewAllLink: Link({ label: "View all link" }),
    viewAllLabel: TextInput({ label: "View all label", defaultValue: "Shop new arrivals" }),
    viewAllStyle: Select({
      label: "View all button style",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
      ],
      defaultValue: "secondary",
    }),
    cols: Select({
      label: "Columns",
      options: [
        { label: "2 columns", value: "2" },
        { label: "3 columns", value: "3" },
        { label: "4 columns", value: "4" },
        { label: "5 columns", value: "5" },
      ],
      defaultValue: "4",
    }),
    showDivider: Checkbox({ label: "Top border", defaultValue: false }),
    skus: List({
      label: "Products (enter SKUs — data pulls from BigCommerce)",
      type: Shape({
        type: {
          sku:  TextInput({ label: "Product SKU" }),
          link: Link({ label: "Override link (optional)" }),
        },
      }),
      getItemLabel: (item) => (item as { sku?: string })?.sku ?? "Product",
    }),
  },
});
