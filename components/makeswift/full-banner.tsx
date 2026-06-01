"use client";

import type { ReactNode } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import {
  Style, TextInput, RichText, Number, Image, Color, Select, Group, Link,
} from "@makeswift/runtime/controls";
import { linkProps, type MSLink } from "@/lib/makeswift/link";
import { EditableRegion } from "@/lib/makeswift/editable";

// Safely extract a URL string from a Makeswift Image control value.
function toUrl(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "url" in v) return (v as { url: string }).url;
  return undefined;
}

type ContentAlignment = "left" | "center" | "right";
type VerticalAlignment = "top" | "center" | "bottom";
type CtaStyle = "primary" | "secondary";

// Map the merchandiser-selected CTA style to the site's real button classes.
function ctaClass(style: CtaStyle | undefined, fallback: CtaStyle, ...modifiers: string[]): string {
  const base = (style ?? fallback) === "secondary" ? "btn btn-ghost" : "btn";
  return [base, ...modifiers].filter(Boolean).join(" ");
}

function FullBanner({
  className,
  backgroundImage,
  overlayOpacity,
  backgroundColor,
  // Renamed keys (…Rt) so the inline RichText controls don't inherit the stale
  // string data saved under the old TextInput/TextArea keys (eyebrow/headline/
  // subheadline), which crashes the builder's introspection. Aliased to locals.
  eyebrowRt: eyebrow,
  headlineRt: headline,
  subheadlineRt: subheadline,
  textColor,
  buttons,
  contentAlignment,
  verticalAlignment,
  minHeight,
}: {
  className?: string;
  backgroundImage?: unknown;
  overlayOpacity?: number;
  backgroundColor?: string;
  eyebrowRt?: ReactNode;
  headlineRt?: ReactNode;
  subheadlineRt?: ReactNode;
  textColor?: string;
  // CTA controls live in a collapsible "Buttons" Group (see docs/MAKESWIFT_COMPONENTS.md).
  buttons?: {
    primaryCtaLabel?: string;
    primaryCtaLink?: MSLink;
    primaryCtaStyle?: CtaStyle;
    secondaryCtaLabel?: string;
    secondaryCtaLink?: MSLink;
    secondaryCtaStyle?: CtaStyle;
  };
  contentAlignment?: ContentAlignment;
  verticalAlignment?: VerticalAlignment;
  minHeight?: number;
}) {
  const bgImageUrl = toUrl(backgroundImage);
  const {
    primaryCtaLabel,
    primaryCtaLink,
    primaryCtaStyle,
    secondaryCtaLabel,
    secondaryCtaLink,
    secondaryCtaStyle,
  } = buttons ?? {};
  const align = contentAlignment ?? "left";
  const vAlign = verticalAlignment ?? "center";
  const resolvedMinHeight = minHeight ?? 400;
  const resolvedOverlayOpacity = overlayOpacity ?? 40;
  const resolvedTextColor = textColor ?? "#ffffff";
  const resolvedBgColor = backgroundColor ?? "#1a2e4a";

  const textAlignStyle = align === "center" ? "center" : align === "right" ? "right" : "left";
  const justifyItems = align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start";
  const sectionAlignItems = vAlign === "top" ? "flex-start" : vAlign === "bottom" ? "flex-end" : "center";

  return (
    <section
      className={className ?? ""}
      style={{
        position: "relative",
        minHeight: resolvedMinHeight,
        background: bgImageUrl
          ? `url(${bgImageUrl}) center/cover no-repeat`
          : resolvedBgColor,
        display: "flex",
        alignItems: sectionAlignItems,
        overflow: "hidden",
      }}
    >
      {/* Dark overlay for background images */}
      {bgImageUrl && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "#000",
            opacity: resolvedOverlayOpacity / 100,
          }}
        />
      )}

      <div
        className="container"
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          paddingTop: 56,
          paddingBottom: 56,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            alignItems: justifyItems,
            textAlign: textAlignStyle,
          }}
        >
          {/* Inline RichText regions: EditableRegion keeps them clickable while
              editing but collapses them when empty on live + interact. */}
          <EditableRegion
            as="span"
            style={{
              fontFamily: "var(--font-geist-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: resolvedTextColor,
              opacity: 0.75,
            }}
          >
            {eyebrow}
          </EditableRegion>
          <EditableRegion
            as="h2"
            style={{
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: "-.03em",
              lineHeight: 1.1,
              margin: 0,
              color: resolvedTextColor,
            }}
          >
            {headline}
          </EditableRegion>
          <EditableRegion
            as="p"
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              margin: 0,
              color: resolvedTextColor,
              opacity: 0.85,
              maxWidth: 520,
            }}
          >
            {subheadline}
          </EditableRegion>
          {(primaryCtaLabel || secondaryCtaLabel) && (
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 8,
                justifyContent: justifyItems,
              }}
            >
              {primaryCtaLabel && (
                <a
                  {...linkProps(primaryCtaLink)}
                  className={ctaClass(primaryCtaStyle, "primary", "btn-lg")}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {primaryCtaLabel}
                </a>
              )}
              {secondaryCtaLabel && (
                <a
                  {...linkProps(secondaryCtaLink)}
                  className={ctaClass(secondaryCtaStyle, "secondary", "btn-lg")}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {secondaryCtaLabel}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

    </section>
  );
}

const ctaStyleSelect = (label: string, defaultValue: CtaStyle) =>
  Select({
    label,
    options: [
      { label: "Primary", value: "primary" },
      { label: "Secondary", value: "secondary" },
    ],
    defaultValue,
  });

runtime.registerComponent(FullBanner, {
  type: "acme/full-banner",
  label: "Banners & Ads / Full Banner Widget",
  props: {
    className: Style(),

    // Background
    backgroundImage: Image({ label: "Background image", format: Image.Format.URL }),
    overlayOpacity: Number({ label: "Overlay opacity %", defaultValue: 40, min: 0, max: 100 }),
    backgroundColor: Color({ label: "Background color", defaultValue: "#1a2e4a" }),

    // Content — inline RichText: click directly on the canvas and type, instead
    // of editing in the side panel. Fresh `…Rt` keys (not eyebrow/headline/
    // subheadline) so they don't read the legacy TextInput/TextArea strings still
    // saved on existing pages — feeding a plain string to a RichText control
    // crashes the builder's introspection.
    eyebrowRt: RichText({ mode: RichText.Mode.Inline, defaultValue: "" }),
    headlineRt: RichText({ mode: RichText.Mode.Inline, defaultValue: "Headline text" }),
    subheadlineRt: RichText({ mode: RichText.Mode.Inline, defaultValue: "" }),
    textColor: Select({
      label: "Font color",
      options: [
        { label: "Light text", value: "#ffffff" },
        { label: "Dark text", value: "#000000" },
      ],
      defaultValue: "#ffffff",
    }),

    // Layout
    contentAlignment: Select({
      label: "Horizontal alignment",
      options: [
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
      ],
      defaultValue: "left",
    }),
    verticalAlignment: Select({
      label: "Vertical alignment",
      options: [
        { value: "top", label: "Top" },
        { value: "center", label: "Center" },
        { value: "bottom", label: "Bottom" },
      ],
      defaultValue: "center",
    }),
    minHeight: Number({ label: "Min height (px)", defaultValue: 400, min: 200, max: 800 }),

    // Buttons — collapsed Popover group at the bottom of the panel.
    // See docs/MAKESWIFT_COMPONENTS.md for the shared convention.
    buttons: Group({
      label: "Buttons",
      preferredLayout: Group.Layout.Popover,
      props: {
        primaryCtaLabel: TextInput({ label: "Primary CTA label", defaultValue: "Shop now" }),
        primaryCtaLink: Link({ label: "Primary CTA link" }),
        primaryCtaStyle: ctaStyleSelect("Primary button style", "primary"),
        secondaryCtaLabel: TextInput({ label: "Secondary CTA label (optional)", defaultValue: "" }),
        secondaryCtaLink: Link({ label: "Secondary CTA link" }),
        secondaryCtaStyle: ctaStyleSelect("Secondary button style", "secondary"),
      },
    }),
  },
});
