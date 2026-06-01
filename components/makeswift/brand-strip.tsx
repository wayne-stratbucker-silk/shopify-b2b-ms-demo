"use client";

import { useState, useEffect } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput, Select, Number, List, Shape } from "@makeswift/runtime/controls";
import NextImage from "next/image";

interface BCBrand {
  id: number;
  name: string;
  imageUrl: string;
  url: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BrandStrip(props: any) {
  const { heading, logoHeight, layout, maxBrands, selectedBrands, className } = props as {
    heading?: string;
    logoHeight?: string;
    layout?: "pill" | "logo-grid";
    maxBrands?: number;
    selectedBrands?: Array<{ name?: string }>;
    className?: string;
  };

  const [allBrands, setAllBrands] = useState<BCBrand[] | null>(null);

  useEffect(() => {
    fetch("/api/shopify/vendors")
      .then((r) => r.json())
      .then((data: BCBrand[]) => setAllBrands(Array.isArray(data) ? data : []))
      .catch(() => setAllBrands([]));
  }, []);

  const ready = allBrands !== null;

  // If specific brands are selected, filter + preserve order; otherwise show all (up to maxBrands)
  const brands: BCBrand[] = !allBrands
    ? []
    : selectedBrands?.length
      ? selectedBrands
          .map((sel) => {
            const needle = (sel.name ?? "").toLowerCase().trim();
            return allBrands.find((b) => b.name.toLowerCase() === needle);
          })
          .filter((b): b is BCBrand => Boolean(b))
      : maxBrands && maxBrands > 0
        ? allBrands.slice(0, maxBrands)
        : allBrands;

  const height = parseInt(logoHeight ?? "40", 10);
  const isLogoGrid = layout === "logo-grid";

  return (
    <section className={className ?? ""}>
      <div className="container">
        {heading && (
          <p style={{
            fontSize: 11, fontWeight: 600, letterSpacing: ".08em",
            textTransform: "uppercase", color: "var(--muted)", marginBottom: 20, marginTop: 0,
          }}>
            {heading}
          </p>
        )}

        {!ready && (
          <p style={{ fontSize: 13, color: "var(--muted-2)" }}>Loading brands…</p>
        )}

        {ready && brands.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--muted-2)" }}>
            No brands available. Add brand names in the Makeswift panel to display them here.
          </p>
        )}

        {isLogoGrid ? (
          <div
            className="acme-brand-grid acme-brand-grid--logo"
            data-count={Math.min(brands.length || 6, 6)}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${Math.min(brands.length || 6, 6)}, 1fr)`,
              gap: 1,
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-card)",
              overflow: "hidden",
              background: "var(--line)",
            }}
          >
            {brands.map((b) => (
              <a
                key={b.id}
                href={b.url}
                aria-label={b.name}
                style={{
                  background: "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px 16px",
                  textDecoration: "none",
                  minHeight: `${height + 32}px`,
                }}
              >
                {b.imageUrl ? (
                  <span
                    style={{
                      position: "relative",
                      display: "inline-block",
                      // Hold a roughly 3:1 aspect ratio so logos don't jump in height before they load.
                      width: `${height * 3}px`,
                      maxWidth: "100%",
                      height: `${height}px`,
                    }}
                  >
                    <NextImage
                      src={b.imageUrl}
                      alt={b.name}
                      fill
                      sizes={`(max-width:480px) 33vw, (max-width:768px) 25vw, ${height * 3}px`}
                      style={{ objectFit: "contain" }}
                    />
                  </span>
                ) : (
                  <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-.01em", color: "var(--ink-2)" }}>
                    {b.name}
                  </span>
                )}
              </a>
            ))}
          </div>
        ) : (
          <div
            className="acme-brand-grid acme-brand-grid--pill"
            style={{ display: "flex", flexWrap: "wrap", gap: "12px 16px", alignItems: "center" }}
          >
            {brands.map((b) => (
              <a
                key={b.id}
                href={b.url}
                aria-label={b.name}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  // Floor pill height at 44px to satisfy the tap-target minimum on mobile.
                  height: b.imageUrl ? `${Math.max(height + 8, 44)}px` : 44,
                  padding: b.imageUrl ? "4px 12px" : "0 16px",
                  border: "1px solid var(--line)", borderRadius: "var(--radius)",
                  fontSize: 12, fontWeight: 600, color: "var(--ink-2)",
                  textDecoration: "none", background: "var(--surface)",
                }}
              >
                {b.imageUrl ? (
                  <span
                    style={{
                      position: "relative",
                      display: "inline-block",
                      width: `${height * 2}px`,
                      maxWidth: 80,
                      height: `${height}px`,
                    }}
                  >
                    <NextImage
                      src={b.imageUrl}
                      alt={b.name}
                      fill
                      sizes={`${height * 2}px`}
                      style={{ objectFit: "contain" }}
                    />
                  </span>
                ) : (
                  b.name
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

runtime.registerComponent(BrandStrip, {
  type: "acme-brand-strip",
  label: "Trust & Brand / Brand Strip",
  props: {
    className: Style(),
    heading: TextInput({ label: "Eyebrow label", defaultValue: "Stocking these brands" }),
    layout: Select({
      label: "Layout",
      options: [
        { label: "Pill buttons", value: "pill" },
        { label: "Logo grid", value: "logo-grid" },
      ],
      defaultValue: "pill",
    }),
    logoHeight: Select({
      label: "Logo max height",
      options: [
        { label: "24px", value: "24" },
        { label: "32px", value: "32" },
        { label: "40px", value: "40" },
        { label: "56px", value: "56" },
      ],
      defaultValue: "40",
    }),
    selectedBrands: List({
      label: "Specific brands (leave empty to show all)",
      type: Shape({
        type: {
          name: TextInput({ label: "Brand name (must match BC exactly)" }),
        },
      }),
      getItemLabel: (item) => (item as { name?: string })?.name ?? "Brand",
    }),
    maxBrands: Number({ label: "Max brands to show when none selected (0 = all)", defaultValue: 0 }),
  },
});
