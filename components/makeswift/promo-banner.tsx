"use client";

import type { ReactNode } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput, RichText, Select, Image, Checkbox, Group, Link } from "@makeswift/runtime/controls";
import { MSImage, toUrl } from "@/components/makeswift/ms-image";
import { AltTextNotice } from "@/components/makeswift/builder-notice";
import { isAltMissing } from "@/lib/seo-audit";
import { ctaClass, type CtaStyle } from "@/lib/makeswift/cta-class";
import { linkProps, type MSLink } from "@/lib/makeswift/link";
import { EditableRegion } from "@/lib/makeswift/editable";

type MediaType = "color" | "image" | "video";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PromoBanner(props: any) {
  const {
    // Renamed keys (…Rt) so the inline RichText controls don't inherit the
    // stale string data saved under the old TextInput keys (eyebrow/heading/
    // body), which crashes the builder's introspection. Aliased to local names.
    eyebrowRt: eyebrow, headingRt: heading, bodyRt: body,
    buttons,
    priceBefore, priceAfter, skuLabel, badgeText,
    mediaType, mediaImage, mediaAlt, mediaDecorative, mediaVideoUrl, mediaVideoLoop,
    mediaVideoPoster,
    className,
  } = props as {
    eyebrowRt?: ReactNode;
    headingRt?: ReactNode;
    bodyRt?: ReactNode;
    buttons?: {
      primaryCtaLabel?: string;
      primaryCtaLink?: MSLink;
      primaryCtaStyle?: CtaStyle;
      secondaryCtaLabel?: string;
      secondaryCtaLink?: MSLink;
      secondaryCtaStyle?: CtaStyle;
    };
    priceBefore?: string;
    priceAfter?: string;
    skuLabel?: string;
    badgeText?: string;
    mediaType?: MediaType;
    mediaImage?: unknown;
    mediaAlt?: string;
    mediaDecorative?: boolean;
    mediaVideoUrl?: string;
    mediaVideoLoop?: boolean;
    mediaVideoPoster?: unknown;
    className?: string;
  };
  const {
    primaryCtaLabel, primaryCtaLink, primaryCtaStyle,
    secondaryCtaLabel, secondaryCtaLink, secondaryCtaStyle,
  } = buttons ?? {};

  const mediaImageUrl = toUrl(mediaImage);
  const mediaVideoPosterUrl = toUrl(mediaVideoPoster);
  // Auto-detect: if the editor uploaded an image without flipping the dropdown,
  // still render it. Mirrors the hero-banner pattern.
  const effectiveMediaType: MediaType =
    mediaType && mediaType !== "color"
      ? mediaType
      : mediaImageUrl
        ? "image"
        : mediaVideoUrl
          ? "video"
          : "color";
  const hasPrice = !!(priceAfter || priceBefore);
  const decorativeImage = mediaDecorative === true;
  const imgAlt = decorativeImage ? "" : (mediaAlt?.trim() || "");
  // Builder-only: image set on the media panel but no alt text and not decorative.
  const altIssues =
    effectiveMediaType === "image" && isAltMissing(mediaImage, mediaAlt, decorativeImage)
      ? ["Image"]
      : [];

  return (
    <section className={className ?? ""}>
      <div className="container">
        <AltTextNotice items={altIssues} />
        <div className="card acme-promo-2col">
          {/* ── Copy ── */}
          <div className="acme-promo-copy">
            {/* Inline RichText regions: EditableRegion keeps them clickable while
                editing but collapses them when empty on live + interact. */}
            <EditableRegion as="span" className="eyebrow">{eyebrow}</EditableRegion>
            <EditableRegion as="h2" className="acme-promo-heading">{heading}</EditableRegion>
            <EditableRegion as="p" className="acme-promo-body">{body}</EditableRegion>

            {/* Mobile-only price block — visible when the overlay collapses
                under the copy at ≤768px. Hidden on desktop via CSS. */}
            {hasPrice && (
              <div className="acme-promo-price-inline">
                {skuLabel && <div className="acme-promo-sku">{skuLabel}</div>}
                <div className="acme-promo-price">
                  {priceAfter}
                  {priceBefore && (
                    <span className="acme-promo-price-was">{priceBefore}</span>
                  )}
                  {badgeText && <span className="badge badge-sale acme-promo-price-badge">{badgeText}</span>}
                </div>
              </div>
            )}

            <div className="acme-promo-cta">
              {primaryCtaLabel && (
                <a {...linkProps(primaryCtaLink)} className={ctaClass(primaryCtaStyle, "primary")}>{primaryCtaLabel}</a>
              )}
              {secondaryCtaLabel && (
                <a {...linkProps(secondaryCtaLink)} className={ctaClass(secondaryCtaStyle, "secondary")}>{secondaryCtaLabel}</a>
              )}
            </div>
          </div>

          {/* ── Media panel ── */}
          <div className="acme-promo-media">
            {effectiveMediaType === "image" && mediaImageUrl && (
              <MSImage
                src={mediaImageUrl}
                alt={imgAlt}
                sizes="(max-width:768px) 100vw, 40vw"
                quality={72}
                style={{ position: "absolute", inset: 0 }}
              />
            )}
            {effectiveMediaType === "video" && mediaVideoUrl && (
              <video
                src={mediaVideoUrl}
                poster={mediaVideoPosterUrl ?? undefined}
                autoPlay
                muted
                playsInline
                loop={mediaVideoLoop !== false}
                preload="metadata"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
            {effectiveMediaType === "color" && (
              <div className="acme-promo-media-placeholder">
                <span className="acme-promo-media-placeholder-label">
                  Color / gradient
                </span>
              </div>
            )}

            {/* Desktop price overlay — collapses to the inline block above on mobile. */}
            {hasPrice && (
              <div className="acme-promo-price-overlay">
                <div>
                  {skuLabel && <div className="acme-promo-sku">{skuLabel}</div>}
                  <div className="acme-promo-price">
                    {priceAfter}
                    {priceBefore && (
                      <span className="acme-promo-price-was">{priceBefore}</span>
                    )}
                  </div>
                </div>
                {badgeText && <span className="badge badge-sale">{badgeText}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

runtime.registerComponent(PromoBanner, {
  type: "acme-promo-banner",
  label: "Banners & Ads / Promo Banner",
  props: {
    className: Style(),
    // Inline RichText: click directly on the canvas and type, instead of
    // editing in the side panel. Fresh `…Rt` keys (not eyebrow/heading/body) so
    // they don't read the legacy TextInput strings still saved on existing
    // pages — feeding a plain string to a RichText control crashes the builder's
    // introspection.
    eyebrowRt: RichText({ mode: RichText.Mode.Inline, defaultValue: "Q2 contractor promo" }),
    headingRt: RichText({ mode: RichText.Mode.Inline, defaultValue: "15% off Cree High-Bay through June 30" }),
    bodyRt: RichText({ mode: RichText.Mode.Inline, defaultValue: "Includes the full UL-series LED linear high-bay line. Stacks with contract tier — no code needed." }),

    // ── Price overlay (optional) ──
    priceAfter: TextInput({ label: "Price after discount", defaultValue: "$185.30" }),
    priceBefore: TextInput({ label: "Price before (struck out)" }),
    skuLabel: TextInput({ label: "SKU label", defaultValue: "UL-200W-50K" }),
    badgeText: TextInput({ label: "Badge text", defaultValue: "−15%" }),

    // ── Media ──
    mediaType: Select({
      label: "Media panel",
      options: [
        { label: "Color / gradient", value: "color" },
        { label: "Image", value: "image" },
        { label: "Video (autoplay)", value: "video" },
      ],
      defaultValue: "color",
    }),
    mediaImage: Image({ label: "Promo image" }),
    mediaAlt: TextInput({ label: "Image alt text (accessibility)", defaultValue: "" }),
    mediaDecorative: Checkbox({ label: "Decorative image (no alt needed)", defaultValue: false }),
    mediaVideoUrl: TextInput({ label: "Video URL (.mp4 / .webm)" }),
    mediaVideoLoop: Checkbox({ label: "Loop video", defaultValue: true }),
    mediaVideoPoster: Image({ label: "Video poster frame" }),

    // Buttons — collapsed Popover group at the bottom of the panel.
    // See docs/MAKESWIFT_COMPONENTS.md for the shared convention.
    buttons: Group({
      label: "Buttons",
      preferredLayout: Group.Layout.Popover,
      props: {
        primaryCtaLabel: TextInput({ label: "Primary button label", defaultValue: "Shop Cree High-Bay" }),
        primaryCtaLink: Link({ label: "Primary button link" }),
        primaryCtaStyle: Select({
          label: "Primary button style",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Secondary", value: "secondary" },
          ],
          defaultValue: "primary",
        }),
        secondaryCtaLabel: TextInput({ label: "Secondary button label", defaultValue: "View promo terms" }),
        secondaryCtaLink: Link({ label: "Secondary button link" }),
        secondaryCtaStyle: Select({
          label: "Secondary button style",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Secondary", value: "secondary" },
          ],
          defaultValue: "secondary",
        }),
      },
    }),
  },
});
