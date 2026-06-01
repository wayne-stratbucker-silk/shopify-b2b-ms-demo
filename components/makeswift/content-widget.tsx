"use client";

import type { ReactNode } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput, RichText, Select, Group, Link } from "@makeswift/runtime/controls";
import { linkProps, type MSLink } from "@/lib/makeswift/link";
import { EditableRegion } from "@/lib/makeswift/editable";

type Align = "left" | "center" | "right";
type CtaStyle = "primary" | "secondary";

// Map the merchandiser-selected CTA style to the site's real button classes.
// Primary → `.btn`; Secondary → `.btn .btn-ghost`. Size/other modifiers append.
function ctaClass(style: CtaStyle | undefined, fallback: CtaStyle, ...modifiers: string[]): string {
  const base = (style ?? fallback) === "secondary" ? "btn btn-ghost" : "btn";
  return [base, ...modifiers].filter(Boolean).join(" ");
}

interface ContentWidgetProps {
  className?: string;
  align?: Align;
  eyebrow?: ReactNode;
  heading?: ReactNode;
  subheading?: ReactNode;
  copy?: ReactNode;
  // CTA controls live in a collapsible "Buttons" Group, so they arrive nested.
  buttons?: {
    primaryCtaLabel?: string;
    primaryCtaLink?: MSLink;
    primaryCtaStyle?: CtaStyle;
    secondaryCtaLabel?: string;
    secondaryCtaLink?: MSLink;
    secondaryCtaStyle?: CtaStyle;
  };
}

function ContentWidget({
  className,
  align = "center",
  eyebrow,
  heading,
  subheading,
  copy,
  buttons,
}: ContentWidgetProps) {
  const {
    primaryCtaLabel,
    primaryCtaLink,
    primaryCtaStyle,
    secondaryCtaLabel,
    secondaryCtaLink,
    secondaryCtaStyle,
  } = buttons ?? {};

  return (
    <section className={`cw-section ${className ?? ""}`}>
      <div className="container">
        {/* Inline RichText regions: EditableRegion keeps them clickable while
            editing (build/content) but collapses them when empty on the live
            site and in the builder's interact preview. */}
        <div className={`cw-content h-${align}`}>
          <EditableRegion as="span" className="cw-eyebrow">{eyebrow}</EditableRegion>
          <EditableRegion as="h2" className="cw-heading">{heading}</EditableRegion>
          <EditableRegion as="p" className="cw-subheading">{subheading}</EditableRegion>
          <EditableRegion as="div" className="cw-copy">{copy}</EditableRegion>
          {(primaryCtaLabel || secondaryCtaLabel) && (
            <div className="cw-ctas">
              {primaryCtaLabel ? (
                <a {...linkProps(primaryCtaLink)} className={ctaClass(primaryCtaStyle, "primary", "btn-lg")}>
                  {primaryCtaLabel}
                </a>
              ) : null}
              {secondaryCtaLabel ? (
                <a {...linkProps(secondaryCtaLink)} className={ctaClass(secondaryCtaStyle, "secondary", "btn-lg")}>
                  {secondaryCtaLabel}
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

runtime.registerComponent(ContentWidget, {
  type: "acme/content-widget",
  label: "Content / Content Widget",
  props: {
    className: Style(),
    align: Select({
      label: "Content alignment (horizontal)",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
      ],
      defaultValue: "center",
    }),
    // Inline RichText: click directly on the canvas and type, instead of
    // editing in the side panel. Note: changing the control type from
    // TextInput/TextArea resets these fields — the previous default copy does
    // not carry over and must be re-entered once in the builder.
    eyebrow: RichText({ mode: RichText.Mode.Inline }),
    heading: RichText({ mode: RichText.Mode.Inline }),
    subheading: RichText({ mode: RichText.Mode.Inline }),
    copy: RichText({ mode: RichText.Mode.Inline }),

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
        primaryCtaLink: Link({ label: "Primary button link" }),
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

export default ContentWidget;
