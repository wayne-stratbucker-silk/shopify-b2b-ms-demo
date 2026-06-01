"use client";
/* eslint-disable @next/next/no-img-element */

import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput, Image, Select, Link } from "@makeswift/runtime/controls";
import { linkProps, type MSLink } from "@/lib/makeswift/link";

type CtaStyle = "primary" | "secondary";

// Map the merchandiser-selected CTA style to the site's real button classes.
// Primary → `.btn`; Secondary → `.btn .btn-ghost`.
function ctaClass(style: CtaStyle | undefined, fallback: CtaStyle, ...modifiers: string[]): string {
  const base = (style ?? fallback) === "secondary" ? "btn btn-ghost" : "btn";
  return [base, ...modifiers].filter(Boolean).join(" ");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PlpInterstitial(props: any) {
  const {
    sponsor,
    headline,
    ctaLabel,
    ctaLink,
    ctaStyle,
    brandImage,
    className,
  } = props as {
    sponsor?: string;
    headline?: string;
    ctaLabel?: string;
    ctaLink?: MSLink;
    ctaStyle?: CtaStyle;
    brandImage?: string;
    className?: string;
  };

  const isEmpty = !headline && !sponsor;

  return (
    <a
      {...linkProps(ctaLink)}
      // Stable hook class (`plp-interstitial`) for the mobile stacking rules in
      // globals.css, alongside the Makeswift-generated `className`.
      className={`plp-interstitial ${className ?? ""}`.trim()}
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr auto",
        alignItems: "center",
        gap: 20,
        marginBottom: 24,
        background: "var(--ink)",
        color: "#fff",
        borderRadius: 6,
        overflow: "hidden",
        height: 72,
        textDecoration: "none",
        cursor: "pointer",
      }}
    >
      {/* Brand image / logo panel */}
      <div
        style={{
          height: "100%",
          position: "relative",
          background:
            "repeating-linear-gradient(135deg, rgba(255,255,255,.04) 0 1px, transparent 1px 12px), linear-gradient(135deg, #14263a 0%, #0d1620 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {brandImage ? (
          <img
            src={brandImage}
            alt={sponsor ?? ""}
            style={{ maxWidth: 90, maxHeight: 44, objectFit: "contain" }}
          />
        ) : (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: ".12em",
              color: "rgba(255,255,255,.35)",
              textTransform: "uppercase",
            }}
          >
            BRAND/HERO
          </span>
        )}
      </div>

      {/* Copy */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        {sponsor && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9.5,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,.5)",
            }}
          >
            {sponsor}
          </span>
        )}
        {headline ? (
          <strong
            className="plp-interstitial-headline"
            style={{
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "-.01em",
              color: "#fff",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {headline}
          </strong>
        ) : isEmpty ? (
          <span
            style={{
              fontSize: 11,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,.25)",
            }}
          >
            PLP Interstitial — edit in panel →
          </span>
        ) : null}
      </div>

      {/* CTA — rendered as a span (the whole card is the <a>) but styled with
          the site button classes so the merchandiser can pick Primary/Secondary. */}
      {ctaLabel && (
        <span
          className={ctaClass(ctaStyle, "secondary", "btn-sm")}
          // This strip sits on a dark (--ink) card, so keep the CTA text/border
          // light for legibility — the .btn/.btn-ghost classes are tuned for
          // light surfaces. Only color is overridden; sizing/shape come from .btn.
          style={{ marginRight: 20, marginLeft: 4, flexShrink: 0, color: "#fff", borderColor: "rgba(255,255,255,.35)" }}
        >
          {ctaLabel}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </span>
      )}
    </a>
  );
}

runtime.registerComponent(PlpInterstitial, {
  type: "acme-plp-interstitial",
  label: "Banners & Ads / PLP Interstitial Ad",
  props: {
    className: Style(),
    sponsor: TextInput({ label: "Sponsor label", defaultValue: "Sponsored · Lithonia" }),
    headline: TextInput({ label: "Headline", defaultValue: "15% off all 2×4 troffers through May 31" }),
    ctaLabel: TextInput({ label: "CTA label", defaultValue: "Shop Lithonia" }),
    ctaLink: Link({ label: "CTA link" }),
    ctaStyle: Select({
      label: "CTA button style",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
      ],
      defaultValue: "secondary",
    }),
    brandImage: Image({ label: "Brand logo / image" }),
  },
});
