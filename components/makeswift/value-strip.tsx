"use client";

import type { ReactNode } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput, RichText, Image, Select, Color, Group, Number as MSNumber, Checkbox } from "@makeswift/runtime/controls";
import { toUrl } from "@/components/makeswift/ms-image";
import { AltTextNotice } from "@/components/makeswift/builder-notice";
import { isAltMissing } from "@/lib/seo-audit";
import { EditableRegion } from "@/lib/makeswift/editable";
import NextImage from "next/image";

type Layout = "horizontal" | "vertical";

interface SlotMedia {
  image?: unknown;
  imageAlt?: string;
  // Icons are decorative by default (a text label sits beside them). Authors can
  // uncheck this when the icon image carries meaning, which then requires alt.
  decorative?: boolean;
  icon?: string;
}

interface ValueStripProps {
  className?: string;
  layout?: Layout;
  borderColor?: string;
  // "1".."4" — how many of the fixed slots to render.
  visibleCount?: string;
  iconSize?: number;
  // Heading/text are inline-editable (RichText inline → ReactNode). They live at
  // the top level because inline RichText can't be nested in a List/Shape/Group.
  // Icon/image for each slot are collapsed into a per-item Popover group.
  item1Heading?: ReactNode; item1Text?: ReactNode; item1Media?: SlotMedia;
  item2Heading?: ReactNode; item2Text?: ReactNode; item2Media?: SlotMedia;
  item3Heading?: ReactNode; item3Text?: ReactNode; item3Media?: SlotMedia;
  item4Heading?: ReactNode; item4Text?: ReactNode; item4Media?: SlotMedia;
}

function ValueStrip({
  className,
  layout = "horizontal",
  borderColor,
  visibleCount = "4",
  iconSize = 32,
  item1Heading, item1Text, item1Media,
  item2Heading, item2Text, item2Media,
  item3Heading, item3Text, item3Media,
  item4Heading, item4Text, item4Media,
}: ValueStripProps) {
  const allSlots = [
    { heading: item1Heading, text: item1Text, media: item1Media },
    { heading: item2Heading, text: item2Text, media: item2Media },
    { heading: item3Heading, text: item3Text, media: item3Media },
    { heading: item4Heading, text: item4Text, media: item4Media },
  ];
  const count = Math.min(Math.max(parseInt(visibleCount ?? "4", 10) || 4, 1), 4);
  const slots = allSlots.slice(0, count);
  const safeIcon = Math.min(Math.max(iconSize, 16), 96);
  // Builder-only: icons are decorative by default, so this only fires when an
  // author unchecks "Decorative" on an item and leaves the alt text blank.
  const altIssues = slots
    .map((slot, i) =>
      isAltMissing(slot.media?.image, slot.media?.imageAlt, slot.media?.decorative !== false)
        ? `Item ${i + 1}`
        : null,
    )
    .filter((x): x is string => x !== null);

  return (
    <div className={className ?? ""}>
      <div className="container">
        <AltTextNotice items={altIssues} />
        {/* Items are direct children of .value-strip so CSS grid + borders apply correctly */}
        <div
          className={`value-strip acme-value-strip acme-value-strip--${layout}`}
          data-count={slots.length}
          style={{
            gridTemplateColumns: `repeat(${slots.length}, 1fr)`,
            ...(borderColor ? { borderColor } : {}),
          }}
        >
          {slots.map((slot, i) => {
            const imageUrl = toUrl(slot.media?.image);
            const icon = slot.media?.icon;
            // Decorative by default → alt="". Only carries an accessible name
            // when the author opts the icon out of "decorative" and provides alt.
            const decorative = slot.media?.decorative !== false;
            const iconAlt = decorative ? "" : (slot.media?.imageAlt?.trim() || "");
            return (
              <div
                key={i}
                className="acme-value-strip-item"
                style={{
                  flexDirection: layout === "vertical" ? "column" : "row",
                  alignItems: layout === "vertical" ? "flex-start" : "center",
                  gap: 12,
                }}
              >
                {imageUrl ? (
                  <span
                    className="acme-value-strip-icon"
                    style={{ position: "relative", width: safeIcon, height: safeIcon, flexShrink: 0, display: "inline-block" }}
                  >
                    <NextImage
                      src={imageUrl}
                      alt={iconAlt}
                      fill
                      sizes={`${safeIcon * 2}px`}
                      style={{ objectFit: "contain" }}
                    />
                  </span>
                ) : icon ? (
                  <span
                    className="acme-value-strip-icon"
                    aria-hidden="true"
                    style={{ fontSize: Math.round(safeIcon * 0.7), lineHeight: 1, flexShrink: 0 }}
                  >
                    {icon}
                  </span>
                ) : null}
                <div>
                  {/* Inline RichText regions: EditableRegion keeps them clickable
                      while editing but collapses them when empty on live + interact. */}
                  <EditableRegion as="div" style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{slot.heading}</EditableRegion>
                  <EditableRegion as="div" style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>{slot.text}</EditableRegion>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Per-item icon/image controls, collapsed into a Popover group to keep the panel
// compact (same convention as the Buttons/Stats groups elsewhere). The heading &
// text are edited inline on the canvas, so they are NOT in this group.
const itemMediaGroup = (label: string, defaultIcon: string) =>
  Group({
    label,
    preferredLayout: Group.Layout.Popover,
    props: {
      image: Image({ label: "Icon image (overrides emoji)", format: Image.Format.URL }),
      // Icons sit beside a text label, so they're decorative by default (alt="").
      // Uncheck when the icon image conveys meaning on its own, then fill alt text.
      decorative: Checkbox({ label: "Decorative icon (no alt needed)", defaultValue: true }),
      imageAlt: TextInput({ label: "Icon alt text (if not decorative)", defaultValue: "" }),
      icon: TextInput({ label: "Emoji icon (fallback)", defaultValue: defaultIcon }),
    },
  });

runtime.registerComponent(ValueStrip, {
  type: "acme-value-strip",
  label: "Trust & Brand / Value Strip",
  props: {
    className: Style(),
    layout: Select({
      label: "Item layout",
      options: [
        { label: "Horizontal (icon + text side by side)", value: "horizontal" },
        { label: "Vertical (icon above text)", value: "vertical" },
      ],
      defaultValue: "horizontal",
    }),
    visibleCount: Select({
      label: "Number of items",
      options: [
        { label: "1", value: "1" },
        { label: "2", value: "2" },
        { label: "3", value: "3" },
        { label: "4", value: "4" },
      ],
      defaultValue: "4",
    }),
    iconSize: MSNumber({ label: "Icon size (px)", defaultValue: 32, min: 16, max: 96, step: 2 }),
    borderColor: Color({ label: "Border color" }),

    // Inline RichText: click directly on the canvas and type, instead of editing
    // in the side panel. Inline RichText can't be nested in a List/Shape, so each
    // item gets its own top-level heading/text props (fixed set of up to 4).
    // Note: changing a control's type resets its stored value — re-enter once.
    item1Heading: RichText({ mode: RichText.Mode.Inline, defaultValue: "Same-day shipping" }),
    item1Text: RichText({ mode: RichText.Mode.Inline, defaultValue: "Order by 4 PM PT from any of 14 DCs" }),
    item2Heading: RichText({ mode: RichText.Mode.Inline, defaultValue: "Net 30/60 terms" }),
    item2Text: RichText({ mode: RichText.Mode.Inline, defaultValue: "Revolving credit up to $250K" }),
    item3Heading: RichText({ mode: RichText.Mode.Inline, defaultValue: "14 locations" }),
    item3Text: RichText({ mode: RichText.Mode.Inline, defaultValue: "Nationwide stocking & will-call" }),
    item4Heading: RichText({ mode: RichText.Mode.Inline, defaultValue: "Contract pricing" }),
    item4Text: RichText({ mode: RichText.Mode.Inline, defaultValue: "Tier 2 rates locked in at checkout" }),

    // Per-item icon/image — collapsed Popover groups (declared after the inline
    // content controls, same as the bottom Buttons group convention).
    item1Media: itemMediaGroup("Item 1 icon / image", "🚚"),
    item2Media: itemMediaGroup("Item 2 icon / image", "📋"),
    item3Media: itemMediaGroup("Item 3 icon / image", "📍"),
    item4Media: itemMediaGroup("Item 4 icon / image", "💳"),
  },
});

export default ValueStrip;
