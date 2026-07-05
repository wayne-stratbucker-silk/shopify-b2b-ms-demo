"use client";

import type { CSSProperties, ReactNode } from "react";
import { useIsInBuilder } from "@makeswift/runtime/react";

// Inline, builder-only governance notice. Renders nothing on the live storefront
// (gated by useIsInBuilder), so it is purely an author aid — never visitor UI.
//
// Modeled on FinishedSkuNotice (the parent-SKU warning on the Shoppable
// Diagram) so every governance helper — missing alt text, heading hierarchy —
// shares one look and one builder gate. Hosts render <BuilderNotice> directly
// and don't need their own useIsInBuilder() check.

export type BuilderNoticeSeverity = "warn" | "info";

export function BuilderNotice({
  title,
  severity = "warn",
  role = "alert",
  style,
  children,
}: {
  title: ReactNode;
  severity?: BuilderNoticeSeverity;
  role?: "alert" | "status";
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const inBuilder = useIsInBuilder();
  if (!inBuilder) return null;

  const border = severity === "warn" ? "var(--warn, #b45309)" : "var(--info, #2563eb)";
  const background = severity === "warn" ? "var(--warn-fade, #fff7ed)" : "var(--info-fade, #eff6ff)";

  return (
    <div
      role={role}
      style={{
        margin: "12px 0",
        padding: "12px 14px",
        border: `1px solid ${border}`,
        background,
        borderRadius: "var(--radius, 6px)",
        fontSize: 13,
        lineHeight: 1.5,
        color: "var(--ink, #1a1a1a)",
        ...style,
      }}
    >
      <strong style={{ display: "block", marginBottom: 4 }}>{title}</strong>
      {children}
    </div>
  );
}

/**
 * Builder-only "this image has no alt text" notice — the alt-text analog of
 * FinishedSkuNotice. Pass one label per offending image; for a single-image
 * component pass a single-element array (the per-item list is only shown when
 * more than one image is affected, e.g. carousel slides or diagram scenes).
 */
export function AltTextNotice({ items }: { items: string[] }) {
  const count = items.length;
  if (count === 0) return null;

  return (
    <BuilderNotice
      title={count === 1 ? "Image is missing alt text" : `${count} images are missing alt text`}
    >
      <span style={{ color: "var(--muted, #666)" }}>
        Add a short description in the “Image alt text” field so screen readers and
        search engines can read {count === 1 ? "it" : "them"}. If the image is purely
        decorative, tick “Decorative image” to silence this.
      </span>
      {count > 1 && (
        <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
          {items.map((label, i) => (
            <li key={`${label}-${i}`} style={{ marginBottom: 2 }}>
              {label}
            </li>
          ))}
        </ul>
      )}
    </BuilderNotice>
  );
}
