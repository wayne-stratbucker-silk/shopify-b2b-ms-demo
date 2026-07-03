"use client";

import { useCompare, type CompareItem } from "./compare-provider";

/**
 * Compare checkbox for a product card / PDP. Renders nothing outside a
 * CompareProvider, so it's safe to drop into ProductCard everywhere.
 */
export function CompareToggle({ item }: { item: CompareItem }) {
  const compare = useCompare();
  if (!compare) return null;

  const active = compare.has(item.handle);
  const disabled = !active && compare.isFull;

  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) compare.toggle(item); }}
      aria-pressed={active}
      disabled={disabled}
      title={active ? "Remove from compare" : disabled ? `Compare up to ${compare.max} products` : "Add to compare"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 999,
        border: `1px solid ${active ? "var(--primary)" : "var(--line-2)"}`,
        background: active ? "var(--primary)" : "var(--bg, #fff)",
        color: active ? "#fff" : disabled ? "var(--muted)" : "var(--ink-2)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {active ? "✓ Compare" : "Compare"}
    </button>
  );
}
