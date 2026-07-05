"use client";

import type { ReactNode } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput, RichText, Select, Image, Group, Checkbox } from "@makeswift/runtime/controls";
import { AltTextNotice } from "@/components/makeswift/builder-notice";
import { isAltMissing } from "@/lib/seo-audit";
import { EditableRegion } from "@/lib/makeswift/editable";

type ImagePosition = "left" | "right";
type Align = "left" | "center" | "right";
type Valign = "top" | "center" | "bottom";
type CtaStyle = "primary" | "secondary";

// Map the merchandiser-selected CTA style to the site's real button classes.
// Primary → `.btn`; Secondary → `.btn .btn-ghost`. Size/other modifiers append.
function ctaClass(style: CtaStyle | undefined, fallback: CtaStyle, ...modifiers: string[]): string {
  const base = (style ?? fallback) === "secondary" ? "btn btn-ghost" : "btn";
  return [base, ...modifiers].filter(Boolean).join(" ");
}

// The Makeswift Image control can return either a URL string or an
// `{ url, dimensions }` object depending on how the value was saved. Safely
// extract a URL string from either shape (mirrors hero-banner.tsx).
function toUrl(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "url" in v) {
    return (v as { url?: string }).url;
  }
  return undefined;
}

interface SideBySideProps {
  className?: string;
  image?: unknown;
  imageMeta?: string;
  imageAlt?: string;
  decorative?: boolean;
  imagePosition?: ImagePosition;
  align?: Align;
  valign?: Valign;
  eyebrow?: ReactNode;
  heading?: ReactNode;
  body?: ReactNode;
  // CTA controls live in a collapsible "Buttons" Group, so they arrive nested.
  buttons?: {
    primaryCtaLabel?: string;
    primaryCtaHref?: string;
    primaryCtaStyle?: CtaStyle;
    secondaryCtaLabel?: string;
    secondaryCtaHref?: string;
    secondaryCtaStyle?: CtaStyle;
  };
}

function SideBySide({
  className,
  image,
  imageMeta,
  imageAlt,
  decorative,
  imagePosition = "left",
  align = "left",
  valign = "center",
  eyebrow,
  heading,
  body,
  buttons,
}: SideBySideProps) {
  const imageUrl = toUrl(image);
  const decorativeImage = decorative === true;
  // Prefer the dedicated alt field; fall back to the caption so pages authored
  // before the alt/caption split don't regress. Decorative → empty alt.
  const effectiveAlt = imageAlt?.trim() || imageMeta?.trim() || "";
  const imgAlt = decorativeImage ? "" : effectiveAlt;
  const altIssues = isAltMissing(image, effectiveAlt, decorativeImage) ? ["Image"] : [];
  const {
    primaryCtaLabel,
    primaryCtaHref,
    primaryCtaStyle,
    secondaryCtaLabel,
    secondaryCtaHref,
    secondaryCtaStyle,
  } = buttons ?? {};

  return (
    <section className={`sbs-section ${className ?? ""}`}>
      <div className="container">
        <AltTextNotice items={altIssues} />
        <div className={`sbs${imagePosition === "right" ? " image-right" : ""}`}>
          <div className="sbs-image">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={imgAlt} loading="lazy" decoding="async" />
            ) : (
              <div className="sbs-image-placeholder" aria-hidden="true">
                <span>IMAGE / UPLOAD IN PANEL</span>
              </div>
            )}
            {imageMeta ? <span className="sbs-image-meta">{imageMeta}</span> : null}
          </div>

          <div className={`sbs-content h-${align} v-${valign}`}>
            {/* Inline RichText regions: EditableRegion keeps them clickable while
                editing but collapses them when empty on live + interact. */}
            <EditableRegion as="span" className="sbs-eyebrow">{eyebrow}</EditableRegion>
            <EditableRegion as="h2" className="sbs-heading">{heading}</EditableRegion>
            <EditableRegion as="p" className="sbs-body">{body}</EditableRegion>
            {(primaryCtaLabel || secondaryCtaLabel) && (
              <div className="sbs-ctas">
                {primaryCtaLabel ? (
                  <a href={primaryCtaHref || "#"} className={ctaClass(primaryCtaStyle, "primary", "btn-lg")}>
                    {primaryCtaLabel}
                  </a>
                ) : null}
                {secondaryCtaLabel ? (
                  <a href={secondaryCtaHref || "#"} className={ctaClass(secondaryCtaStyle, "secondary", "btn-lg")}>
                    {secondaryCtaLabel}
                  </a>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

runtime.registerComponent(SideBySide, {
  type: "acme/side-by-side",
  label: "Content / Side by Side",
  props: {
    className: Style(),
    image: Image({ label: "Image", format: Image.Format.URL }),
    imageMeta: TextInput({
      label: "Image caption (optional)",
      defaultValue: "FIG. 01 / WAREHOUSE-RETROFIT",
    }),
    // Dedicated accessible name, kept separate from the visible caption. Falls
    // back to the caption at render time when left blank (back-compat).
    imageAlt: TextInput({
      label: "Image alt text (accessibility)",
      defaultValue: "",
    }),
    decorative: Checkbox({ label: "Decorative image (no alt needed)", defaultValue: false }),
    imagePosition: Select({
      label: "Image position",
      options: [
        { label: "Left", value: "left" },
        { label: "Right", value: "right" },
      ],
      defaultValue: "left",
    }),
    align: Select({
      label: "Content alignment (horizontal)",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
      defaultValue: "left",
    }),
    valign: Select({
      label: "Content alignment (vertical)",
      options: [
        { label: "Top", value: "top" },
        { label: "Center", value: "center" },
        { label: "Bottom", value: "bottom" },
      ],
      defaultValue: "center",
    }),
    // Inline RichText: click directly on the canvas and type, instead of
    // editing in the side panel. Note: changing the control type from
    // TextInput/TextArea resets these fields — the previous default copy does
    // not carry over and must be re-entered once in the builder.
    eyebrow: RichText({ mode: RichText.Mode.Inline }),
    heading: RichText({ mode: RichText.Mode.Inline }),
    body: RichText({ mode: RichText.Mode.Inline }),

    // Button config is panel-only (URLs/styles can't be inline-edited), so it's
    // collapsed into a Popover group and declared last — this puts it at the
    // bottom of the panel as a single minimized row the admin expands on demand.
    buttons: Group({
      label: "Buttons",
      preferredLayout: Group.Layout.Popover,
      props: {
        primaryCtaLabel: TextInput({
          label: "Primary button label",
          defaultValue: "Browse the catalog",
        }),
        primaryCtaHref: TextInput({ label: "Primary button URL", defaultValue: "/" }),
        primaryCtaStyle: Select({
          label: "Primary button style",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Secondary", value: "secondary" },
          ],
          defaultValue: "primary",
        }),
        secondaryCtaLabel: TextInput({
          label: "Secondary button label",
          defaultValue: "Quick order by SKU",
        }),
        secondaryCtaHref: TextInput({ label: "Secondary button URL", defaultValue: "/quick-order" }),
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

export default SideBySide;
