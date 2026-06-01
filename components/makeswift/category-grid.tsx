"use client";

import { useState, useEffect } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput, List, Shape, Select, Combobox } from "@makeswift/runtime/controls";
import { MSImage } from "@/components/makeswift/ms-image";

interface ShopifyCollection {
  id: string;
  name: string;
  slug: string;
  url: string;
  image?: { url: string; altText?: string };
}

// Combobox value stored per item in the Makeswift builder.
type CollectionRef = { handle: string; name: string };

interface CategoryItem {
  collection?: CollectionRef;
  count?: string;
}

async function collectionOptions(query: string) {
  try {
    const res = await fetch("/api/shopify/collections");
    const collections: ShopifyCollection[] = await res.json();
    const q = query.trim().toLowerCase();
    const opts = collections.map((c) => ({
      id: c.slug,
      label: c.name,
      value: { handle: c.slug, name: c.name } as CollectionRef,
    }));
    return q ? opts.filter((o) => o.label.toLowerCase().includes(q)) : opts;
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CategoryGrid(props: any) {
  const { heading, subheading, categories: catsProp, cols, className } = props as {
    heading?: string;
    subheading?: string;
    categories?: CategoryItem[];
    cols?: string;
    className?: string;
  };

  const [collectionData, setCollectionData] = useState<Record<string, ShopifyCollection>>({});

  useEffect(() => {
    fetch("/api/shopify/collections")
      .then((r) => r.json())
      .then((data: ShopifyCollection[]) => {
        const map: Record<string, ShopifyCollection> = {};
        for (const c of data) map[c.slug] = c;
        setCollectionData(map);
      })
      .catch(() => setCollectionData({}));
  }, []);

  const selectedHandles = catsProp?.length
    ? catsProp.map((c) => c.collection?.handle ?? "").filter(Boolean)
    : Object.keys(collectionData);

  const cats = selectedHandles.map((handle, i) => {
    const col = collectionData[handle];
    const label = col?.name ?? handle.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return {
      handle,
      name: label,
      imageUrl: col?.image?.url ?? "",
      count: catsProp?.[i]?.count ?? "",
    };
  });

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
              key={c.handle ?? i}
              href={c.handle ? `/${c.handle}` : "#"}
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
      label: "Collections (leave empty to show all)",
      type: Shape({
        type: {
          collection: Combobox({
            label: "Collection",
            getOptions: collectionOptions,
          }),
          count: TextInput({ label: "SKU count label (optional, e.g. 1,200+)" }),
        },
      }),
      getItemLabel: (item) => {
        const ref = (item as unknown as { collection?: CollectionRef })?.collection;
        return ref?.name ?? "Select a collection";
      },
    }),
  },
});
