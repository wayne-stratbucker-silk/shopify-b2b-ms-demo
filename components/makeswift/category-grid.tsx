"use client";

import { useState, useEffect } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput, List, Shape, Select } from "@makeswift/runtime/controls";
import { MSImage } from "@/components/makeswift/ms-image";

interface BCCategory {
  id: number;
  slug: string;
  name: string;
  imageUrl: string;
}

const CATEGORY_OPTIONS = [
  { label: "LED Fixtures",       value: "led-fixtures" },
  { label: "Lamps & Bulbs",      value: "lamps-bulbs" },
  { label: "Controls & Sensors", value: "controls-sensors" },
  { label: "Exit & Emergency",   value: "exit-emergency" },
  { label: "Outdoor & Area",     value: "outdoor-area" },
  { label: "Wiring Devices",     value: "wiring-devices" },
  { label: "Conduit & Raceway",  value: "conduit-raceway" },
  { label: "Wire & Cable",       value: "wire-cable" },
];

const DEFAULT_SLUGS = CATEGORY_OPTIONS.map((o) => o.value);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CategoryGrid(props: any) {
  const { heading, subheading, categories: catsProp, cols, className } = props as {
    heading?: string;
    subheading?: string;
    categories?: Array<{ slug?: string; count?: string }>;
    cols?: string;
    className?: string;
  };

  const [bcData, setBcData] = useState<Record<string, BCCategory> | null>(null);

  useEffect(() => {
    fetch("/api/bc/categories")
      .then((r) => r.json())
      .then((data: BCCategory[]) => {
        const map: Record<string, BCCategory> = {};
        for (const cat of data) {
          if (cat.slug) map[cat.slug] = cat;
        }
        setBcData(map);
      })
      .catch(() => setBcData({}));
  }, []);

  const selectedSlugs = catsProp?.length
    ? catsProp.map((c) => c.slug ?? "").filter(Boolean)
    : DEFAULT_SLUGS;

  const cats = selectedSlugs.map((slug, i) => {
    const bc = bcData?.[slug];
    const label = CATEGORY_OPTIONS.find((o) => o.value === slug)?.label ??
      slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      slug,
      name: bc?.name ?? label,
      imageUrl: bc?.imageUrl ?? "",
      count: catsProp?.[i]?.count ?? "",
    };
  });

  // Desktop column count drives the base .g{N} class; mobile rules in
  // globals.css (`.acme-cat-grid` at ≤900/768/480) override the mobile layout
  // so we don't need an inline gridTemplateColumns.
  const colCount = parseInt(cols ?? "4", 10);
  const gClass = `g${colCount}`;

  return (
    <section className={className ?? ""}>
      <div className="container">
        {(heading || subheading) && (
          <div className="h-row" style={{ marginBottom: 20 }}>
            <div>
              {heading && (
                <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.015em", margin: 0 }}>
                  {heading}
                </h2>
              )}
              {subheading && (
                <p style={{ color: "var(--muted)", fontSize: 13, margin: "4px 0 0" }}>{subheading}</p>
              )}
            </div>
          </div>
        )}
        <div className={`acme-cat-grid ${gClass}`}>
          {cats.map((c, i) => (
            <a
              key={c.slug ?? i}
              href={`/category/${c.slug ?? ""}`}
              className="cat-tile"
              style={{ position: "relative" }}
              aria-label={c.name}
            >
              {c.imageUrl ? (
                <MSImage
                  src={c.imageUrl}
                  alt=""
                  className="cat-img"
                  sizes="(max-width:480px) 50vw, (max-width:768px) 50vw, (max-width:900px) 33vw, 25vw"
                  quality={65}
                  style={{ position: "absolute", inset: 0, opacity: 0.5 }}
                  priority={i < 4}
                />
              ) : (
                <MSImage
                  src={undefined}
                  alt=""
                  className="cat-img"
                  fallback="stripes"
                  style={{ position: "absolute", inset: 0, opacity: 0.5 }}
                />
              )}
              <div className="cat-head" style={{ position: "relative" }}>
                <div>
                  <h3 style={{ fontSize: 14 }}>{c.name}</h3>
                </div>
              </div>
              {c.count && (
                <div className="cat-foot" style={{ position: "relative" }}>{c.count} SKUs</div>
              )}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

runtime.registerComponent(CategoryGrid, {
  type: "acme-category-grid",
  label: "Products & Ordering / Category Grid",
  props: {
    className: Style(),
    heading: TextInput({ label: "Heading", defaultValue: "Shop by category" }),
    subheading: TextInput({ label: "Subheading" }),
    cols: Select({
      label: "Columns",
      options: [
        { label: "2 columns", value: "2" },
        { label: "3 columns", value: "3" },
        { label: "4 columns", value: "4" },
        { label: "6 columns", value: "6" },
      ],
      defaultValue: "4",
    }),
    categories: List({
      label: "Categories (leave empty to show all)",
      type: Shape({
        type: {
          slug: Select({
            label: "Category",
            options: [
              { label: "LED Fixtures",       value: "led-fixtures" },
              { label: "Lamps & Bulbs",      value: "lamps-bulbs" },
              { label: "Controls & Sensors", value: "controls-sensors" },
              { label: "Exit & Emergency",   value: "exit-emergency" },
              { label: "Outdoor & Area",     value: "outdoor-area" },
              { label: "Wiring Devices",     value: "wiring-devices" },
              { label: "Conduit & Raceway",  value: "conduit-raceway" },
              { label: "Wire & Cable",       value: "wire-cable" },
            ],
            defaultValue: "led-fixtures",
          }),
          count: TextInput({ label: "SKU count label (optional, e.g. 1,200+)" }),
        },
      }),
      getItemLabel: (item) => {
        const slug = (item as { slug?: string })?.slug ?? "";
        return CATEGORY_OPTIONS.find((o) => o.value === slug)?.label ?? (slug || "Category");
      },
    }),
  },
});
