interface StockPillProps {
  // Rolled-up available quantity (sum across enabled locations).
  stockQty: number;
  // BC inventory_warning_level. Undefined/0 → no low-stock threshold.
  lowStockLevel?: number;
  // Whether BC tracks inventory for this product. When false, we show
  // "Available" (no quantity semantics).
  trackInventory?: boolean;
  // Shopify's availableForSale — purchasable even at qty 0 (continue-selling /
  // untracked). When true and qty is 0/unknown, show "Available" not "Out of stock".
  available?: boolean;
  // Show the numeric quantity inside the badge label. Defaults to true.
  showCount?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

type Tone = "green" | "orange" | "red";

const TONES: Record<Tone, { fg: string }> = {
  green:  { fg: "#1f6b27" },
  orange: { fg: "#e65100" },
  red:    { fg: "#c62828" },
};

// Exported for unit testing of the stock-status resolution logic.
export function resolve(
  stockQty: number,
  lowStockLevel?: number,
  trackInventory?: boolean,
  showCount = true,
  available?: boolean,
): { label: string; tone: Tone } {
  const fmtQty = stockQty.toLocaleString("en-US");

  // No inventory tracking → always available (no qty semantics).
  if (trackInventory === false) return { label: "Available", tone: "green" };
  if (stockQty <= 0) {
    // Trust Shopify's purchasable signal over a 0/unknown quantity: a
    // continue-selling or untracked variant is orderable even at 0 on hand.
    return available
      ? { label: "Available", tone: "green" }
      : { label: "Out of stock", tone: "red" };
  }
  if (lowStockLevel != null && lowStockLevel > 0 && stockQty <= lowStockLevel) {
    return {
      label: showCount ? `Low stock · ${fmtQty}` : "Low stock",
      tone: "orange",
    };
  }
  return {
    label: showCount ? `In stock · ${fmtQty}` : "In stock",
    tone: "green",
  };
}

export function StockPill({
  stockQty,
  lowStockLevel,
  trackInventory,
  available,
  showCount = true,
  className,
  style,
}: StockPillProps) {
  const { label, tone } = resolve(stockQty, lowStockLevel, trackInventory, showCount, available);
  const { fg } = TONES[tone];
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.5,
        background: "#fff",
        color: fg,
        border: `1px solid ${fg}`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: fg, flexShrink: 0 }} />
      {label}
    </span>
  );
}
