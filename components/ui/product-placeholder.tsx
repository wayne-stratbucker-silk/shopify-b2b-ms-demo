interface ProductPHProps {
  // Kept for backward-compat with existing callers; not shown in the design.
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  // Deprecated tone index — ignored now (single consistent placeholder).
  tone?: number;
}

// Deterministic tone from a string. Retained for backward-compat with callers
// that import it; no longer affects the placeholder appearance.
export function toneFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 8;
}

// Single "image coming soon" placeholder shown when a product has no images:
// the header's ACME logo over the brand's diagonal-lined dark-blue pattern.
export function ProductPH({ className, style }: ProductPHProps) {
  return (
    <div
      className={`ph ${className ?? ""}`}
      aria-label="Image coming soon"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "6%",
        overflow: "hidden",
        // Diagonal lined pattern over the brand dark-blue.
        background:
          "repeating-linear-gradient(45deg, rgba(255,255,255,.05) 0 1px, transparent 1px 14px), linear-gradient(160deg, #1a3a5c 0%, #0d1620 100%)",
        ...style,
      }}
    >
      {/* ACME logo mark (mirrors the header brand) */}
      <span
        style={{
          position: "relative",
          zIndex: 1,
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35em",
          color: "#fff",
          fontFamily: "var(--font-geist-sans, sans-serif)",
          fontWeight: 700,
          fontSize: "clamp(11px, 13%, 18px)",
          letterSpacing: "-.01em",
        }}
      >
        <span
          style={{
            background: "var(--primary)",
            color: "#fff",
            width: "1.6em",
            height: "1.6em",
            borderRadius: 4,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-geist-mono, monospace)",
            fontWeight: 700,
          }}
        >
          A
        </span>
        ACME
      </span>
      <span
        style={{
          position: "relative",
          zIndex: 1,
          color: "rgba(255,255,255,.55)",
          fontFamily: "var(--font-geist-mono, monospace)",
          fontSize: "clamp(7px, 8%, 11px)",
          letterSpacing: ".14em",
          textTransform: "uppercase",
        }}
      >
        Image coming soon
      </span>
    </div>
  );
}
