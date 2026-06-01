"use client";

// Builder-only notice for unfinished (parent-of-variants) SKUs.
//
// On the live storefront this renders nothing — the offending items are simply
// hidden. Inside the Makeswift builder it surfaces an inline warning telling the
// author which entered SKUs are parent products and which variant SKUs to use
// instead, so only finished SKUs ever make it onto the page.

import { useIsInBuilder } from "@makeswift/runtime/react";

export interface UnfinishedSkuInfo {
  /** The parent SKU the admin entered. */
  sku: string;
  /** Valid variant SKUs to use instead. */
  variantSkus: string[];
}

export function FinishedSkuNotice({ items }: { items: UnfinishedSkuInfo[] }) {
  const inBuilder = useIsInBuilder();
  if (!inBuilder || items.length === 0) return null;

  return (
    <div
      role="alert"
      style={{
        margin: "12px 0",
        padding: "12px 14px",
        border: "1px solid var(--warn, #b45309)",
        background: "var(--warn-fade, #fff7ed)",
        borderRadius: "var(--radius, 6px)",
        fontSize: 13,
        lineHeight: 1.5,
        color: "var(--ink, #1a1a1a)",
      }}
    >
      <strong style={{ display: "block", marginBottom: 4 }}>
        {items.length === 1 ? "1 product needs a variant" : `${items.length} products need a variant`}
      </strong>
      <span style={{ color: "var(--muted, #666)" }}>
        These SKUs are parent products with variants, so they can&apos;t be added directly.
        Enter a specific variant SKU instead — the item is hidden on the live site until you do.
      </span>
      <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
        {items.map((it) => (
          <li key={it.sku} style={{ marginBottom: 2 }}>
            <code style={{ fontFamily: "var(--font-mono, monospace)" }}>{it.sku}</code>
            {it.variantSkus.length > 0 && (
              <>
                {" → use one of: "}
                {it.variantSkus.map((v, i) => (
                  <span key={v}>
                    {i > 0 && ", "}
                    <code style={{ fontFamily: "var(--font-mono, monospace)" }}>{v}</code>
                  </span>
                ))}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
