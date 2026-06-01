"use client";

import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput, Checkbox, Select, List, Shape } from "@makeswift/runtime/controls";
import { Icon, type IconName } from "@/components/ui/icons";

// ─── Default content (mirrors the original hardcoded login panel) ───
// Lists start empty in the builder, so we fall back to these until a
// merchandiser adds their own items — keeps the panel faithful out of the box.
const DEFAULT_VALUE_PROPS: { icon: IconName; text: string }[] = [
  { icon: "card",    text: "Net 30 / 60 terms — revolving credit up to $250K" },
  { icon: "tag",     text: "Tier 2 contractor pricing on 14,200+ SKUs" },
  { icon: "truck",   text: "Same-day ship from 14 distribution centers" },
  { icon: "quote",   text: "Live quoting, shopping lists, and approval workflows" },
  { icon: "headset", text: "Dedicated account rep + 6am–7pm PT support" },
];

const DEFAULT_STATS: { num: string; label: string }[] = [
  { num: "14,200+", label: "SKUs in stock" },
  { num: "98.4%",   label: "fill rate" },
  { num: "$250K",   label: "credit available" },
];

// Icon choices a merchandiser is likely to want for a value prop.
// `as const` makes this a readonly tuple of literals, which is what the
// Select control's `options` (OptionList<T>) requires.
const VALUE_PROP_ICONS = [
  { label: "Credit card", value: "card" },
  { label: "Price tag",   value: "tag" },
  { label: "Truck",       value: "truck" },
  { label: "Quote",       value: "quote" },
  { label: "Headset",     value: "headset" },
  { label: "Shield",      value: "shield" },
  { label: "Bolt",        value: "bolt" },
  { label: "Dollar",      value: "dollar" },
  { label: "Check",       value: "check" },
  { label: "Package",     value: "pkg" },
  { label: "Phone",       value: "phone" },
  { label: "Mail",        value: "mail" },
  { label: "People",      value: "users" },
  { label: "Building",    value: "building" },
] as const satisfies readonly { label: string; value: IconName }[];

interface ValueProp {
  icon?: IconName;
  text?: string;
}

interface Stat {
  num?: string;
  label?: string;
}

interface AuthMarketingPanelProps {
  className?: string;
  brandLetter?: string;
  brandName?: string;
  brandBadge?: string;
  headline?: string;
  subheading?: string;
  showValueProps?: boolean;
  valueProps?: ValueProp[];
  showStats?: boolean;
  stats?: Stat[];
}

function AuthMarketingPanel({
  className,
  brandLetter,
  brandName,
  brandBadge,
  headline,
  subheading,
  showValueProps,
  valueProps,
  showStats,
  stats,
}: AuthMarketingPanelProps) {
  const vps = valueProps && valueProps.length > 0 ? valueProps : DEFAULT_VALUE_PROPS;
  const sts = stats && stats.length > 0 ? stats : DEFAULT_STATS;

  return (
    // This renders the *content* of the navy auth panel. The panel chrome
    // (flex sizing, navy background, padding, grid overlay, the .auth-panel-left
    // mobile-hide class) stays in the page so responsive behavior is preserved.
    <div className={className} style={{ position: "relative" }}>
      {/* Brand mark */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
        <div
          style={{
            width: 36,
            height: 36,
            background: "rgba(255,255,255,.15)",
            border: "1px solid rgba(255,255,255,.2)",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 16,
            fontFamily: "var(--font-geist-mono, monospace)",
          }}
        >
          {brandLetter}
        </div>
        {brandName && (
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-.01em" }}>{brandName}</span>
        )}
        {brandBadge && (
          <span
            style={{
              fontSize: 9,
              fontWeight: 500,
              letterSpacing: ".1em",
              textTransform: "uppercase",
              padding: "2px 6px",
              border: "1px solid rgba(255,255,255,.25)",
              borderRadius: 2,
              color: "rgba(255,255,255,.6)",
            }}
          >
            {brandBadge}
          </span>
        )}
      </div>

      {/* Headline */}
      {headline && (
        <h1
          style={{
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: "-.03em",
            lineHeight: 1.15,
            margin: "0 0 16px",
            color: "#fff",
          }}
        >
          {headline}
        </h1>
      )}
      {subheading && (
        <p style={{ fontSize: 15, lineHeight: 1.65, color: "rgba(255,255,255,.65)", margin: "0 0 40px", maxWidth: 340 }}>
          {subheading}
        </p>
      )}

      {/* Value props */}
      {showValueProps && vps.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {vps.map(({ icon, text }, i) => (
            <li
              key={`${text ?? ""}-${i}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                fontSize: 13,
                color: "rgba(255,255,255,.75)",
                lineHeight: 1.45,
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <Icon name={icon ?? "check"} size={13} style={{ color: "rgba(255,255,255,.85)" }} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      )}

      {/* Bottom trust stats */}
      {showStats && sts.length > 0 && (
        <div
          style={{
            marginTop: 56,
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,.12)",
            display: "flex",
            gap: 28,
          }}
        >
          {sts.map((s, i) => (
            <div key={`${s.num ?? ""}-${i}`}>
              <div
                style={{
                  fontFamily: "var(--font-geist-mono, monospace)",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#fff",
                  lineHeight: 1.2,
                }}
              >
                {s.num}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

runtime.registerComponent(AuthMarketingPanel, {
  type: "acme/auth-marketing-panel",
  label: "Layout & Slots / Auth Marketing Panel",
  props: {
    className: Style(),
    brandLetter: TextInput({ label: "Brand mark letter", defaultValue: "A" }),
    brandName: TextInput({ label: "Brand name", defaultValue: "ACME" }),
    brandBadge: TextInput({ label: "Brand badge", defaultValue: "B2B" }),
    headline: TextInput({ label: "Headline", defaultValue: "The contractor's portal." }),
    subheading: TextInput({
      label: "Subheading",
      defaultValue:
        "Everything your crew needs — in one place. Trade pricing, net terms, and job-site delivery from 14 DCs.",
    }),
    showValueProps: Checkbox({ label: "Show value props", defaultValue: true }),
    valueProps: List({
      label: "Value props",
      type: Shape({
        type: {
          icon: Select({ label: "Icon", options: VALUE_PROP_ICONS, defaultValue: "check" }),
          text: TextInput({ label: "Text", defaultValue: "New value prop" }),
        },
      }),
      getItemLabel: (item) => (item as ValueProp | undefined)?.text?.trim() || "Value prop",
    }),
    showStats: Checkbox({ label: "Show trust stats", defaultValue: true }),
    stats: List({
      label: "Trust stats",
      type: Shape({
        type: {
          num: TextInput({ label: "Number", defaultValue: "0" }),
          label: TextInput({ label: "Label", defaultValue: "stat" }),
        },
      }),
      getItemLabel: (item) => (item as Stat | undefined)?.num?.trim() || "Stat",
    }),
  },
});
