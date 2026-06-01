"use client";

import { runtime } from "@/lib/makeswift/runtime";
import { Style, List, Shape, Select, TextInput } from "@makeswift/runtime/controls";
import { Icon, type IconName } from "@/components/ui/icons";

// Icons that read as B2B value props. Curated from the full `IconName` set in
// components/ui/icons.tsx so the merchandiser picks from meaningful choices
// rather than the entire UI icon library. `as const satisfies` keeps each
// value a literal `IconName` so Select infers the option union correctly.
export const ICON_OPTIONS = [
  { label: "Truck (freight)", value: "truck" },
  { label: "Card (payment)", value: "card" },
  { label: "Shield (warranty)", value: "shield" },
  { label: "Refresh (returns)", value: "refresh" },
  { label: "Tag (pricing)", value: "tag" },
  { label: "Dollar", value: "dollar" },
  { label: "Headset (support)", value: "headset" },
  { label: "Package", value: "pkg" },
  { label: "Receipt (invoicing)", value: "receipt" },
  { label: "Check", value: "check" },
  { label: "Approve (badge)", value: "approve" },
  { label: "Bolt (fast)", value: "bolt" },
  { label: "Phone", value: "phone" },
  { label: "Mail", value: "mail" },
] as const satisfies readonly { label: string; value: IconName }[];

interface Badge {
  icon?: IconName;
  title?: string;
  sub?: string;
}

// `List` carries no list-level default, so an unedited component arrives with
// `badges: []`. We fall back to these — the badges that were previously
// hardcoded in the PDP — so the live site renders identically until a
// merchandiser adds their own rows in the builder.
const DEFAULT_BADGES: Badge[] = [
  { icon: "truck", title: "Free freight", sub: "Orders $500+, ships same day" },
  { icon: "card", title: "Net 30 / 60", sub: "Invoice net terms on account" },
  { icon: "shield", title: "5-year warranty", sub: "Manufacturer-backed coverage" },
  { icon: "refresh", title: "Easy returns", sub: "30-day hassle-free returns" },
];

interface PdpTrustBadgesProps {
  className?: string;
  badges?: Badge[];
}

function PdpTrustBadges({ className, badges = [] }: PdpTrustBadgesProps) {
  const items = badges.length > 0 ? badges : DEFAULT_BADGES;
  return (
    <div
      className={`pdp-trust ${className ?? ""}`}
      style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}
    >
      {items.map((b, i) => (
        <div
          key={`${b.title ?? "badge"}-${i}`}
          style={{
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-card)",
            padding: "12px 14px",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            background: "var(--surface)",
          }}
        >
          <Icon name={b.icon ?? "truck"} size={16} style={{ color: "var(--primary)", flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 12 }}>{b.title}</div>
            <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>{b.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

runtime.registerComponent(PdpTrustBadges, {
  type: "acme/pdp-trust-badges",
  label: "Products & Ordering / PDP Trust Badges",
  props: {
    className: Style(),
    // Each badge is an icon + title + subtitle, flowed through a 2-column grid.
    // The Shape defaults seed a freshly added row; an empty list falls back to
    // DEFAULT_BADGES in the component so the live site always renders something.
    badges: List({
      label: "Badges",
      type: Shape({
        type: {
          icon: Select({
            label: "Icon",
            options: ICON_OPTIONS,
            defaultValue: "truck",
          }),
          title: TextInput({ label: "Title", defaultValue: "Free freight" }),
          sub: TextInput({ label: "Subtitle", defaultValue: "Orders $500+, ships same day" }),
        },
      }),
      getItemLabel: (b) => b?.title || "Badge",
    }),
  },
});

export default PdpTrustBadges;
