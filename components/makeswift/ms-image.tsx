"use client";

import Image from "next/image";
import { ProductPH } from "@/components/ui/product-placeholder";

// Makeswift Image control can return a URL string or { url, dimensions }
// depending on how the data was saved. Safely extract a URL string from either.
export function toUrl(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v || undefined;
  if (typeof v === "object" && v !== null && "url" in v) {
    const url = (v as { url?: unknown }).url;
    return typeof url === "string" && url ? url : undefined;
  }
  return undefined;
}

type Fallback = "stripes" | "product" | "none";

interface MSImageProps {
  // Accepts the raw Makeswift Image payload (string | { url, dimensions }) or a plain URL.
  src: unknown;
  // Required: non-decorative images need a description; decorative pass alt="".
  alt: string;
  // `fill` + `sizes` is the default for responsive parent-sized boxes.
  sizes?: string;
  priority?: boolean;
  quality?: number;
  className?: string;
  style?: React.CSSProperties;
  // When no src, what to render. `stripes` = striped SVG (category tiles),
  // `product` = ProductPH (image-coming-soon), `none` = empty box.
  fallback?: Fallback;
  // For img-loading semantics on lazy below-the-fold media.
  loading?: "eager" | "lazy";
  // Object-fit override (next/image defaults to cover with `fill`).
  objectFit?: "cover" | "contain";
  // Aspect ratio shorthand — sets the parent's aspect ratio via CSS, parent
  // must be position: relative for `fill` to work.
  aspectRatio?: string;
}

// Striped SVG placeholder used by category tiles when no image is set.
// Pulled out of category-grid.tsx so callers can share one source of truth.
function Stripes({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={{ width: "100%", height: "100%", display: "block", ...style }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id="ms-stripes" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="var(--bg-alt, #efede5)" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="var(--line, #d9d5c7)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#ms-stripes)" />
    </svg>
  );
}

// Shared image wrapper for Makeswift homepage components.
//
// • Accepts the Makeswift Image control's string-or-object payload via toUrl().
// • Defaults to `fill` so callers control the box via a positioned parent.
// • Forces avif/webp through next/image (configured in next.config.ts).
// • Falls back to a striped SVG, the ACME ProductPH, or nothing when src missing.
//
// Usage:
//   <div style={{ position: "relative", aspectRatio: "16/9" }}>
//     <MSImage src={slide.mediaImage} alt={slide.heading ?? ""}
//              priority sizes="(max-width:768px) 100vw, 55vw" />
//   </div>
export function MSImage({
  src,
  alt,
  sizes = "100vw",
  priority = false,
  quality = 70,
  className,
  style,
  fallback = "none",
  loading,
  objectFit = "cover",
  aspectRatio,
}: MSImageProps) {
  const url = toUrl(src);

  const wrapStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    ...(aspectRatio ? { aspectRatio } : null),
    ...style,
  };

  if (!url) {
    if (fallback === "stripes") {
      return (
        <div className={className} style={wrapStyle}>
          <Stripes />
        </div>
      );
    }
    if (fallback === "product") {
      return (
        <div className={className} style={wrapStyle}>
          <ProductPH style={{ width: "100%", height: "100%" }} />
        </div>
      );
    }
    return <div className={className} style={wrapStyle} aria-hidden={!alt} />;
  }

  return (
    <div className={className} style={wrapStyle}>
      <Image
        src={url}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={quality}
        loading={priority ? undefined : loading}
        style={{ objectFit }}
      />
    </div>
  );
}

export default MSImage;
