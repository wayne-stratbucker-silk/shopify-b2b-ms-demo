"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductPH } from "@/components/ui/product-placeholder";

// BigCommerce CDN images flow through next/image for responsive sizing +
// AVIF/WebP. Other hosts (e.g. YouTube thumbnails) fall back to a plain <img>
// since they aren't in next.config images.remotePatterns.
function isOptimizable(url: string): boolean {
  return url.includes("bigcommerce.com");
}

interface GalleryImage {
  url: string;
  // RAW BigCommerce description. Encodes the variant model:
  //   {sku} | {position} | {actual alt text}
  alt: string;
  sortOrder: number;
}

interface GalleryVideo {
  id: string;
  title: string;
}

interface ImageGalleryProps {
  /** Full gallery data from BigCommerce, already sorted by sortOrder. */
  galleryImages?: GalleryImage[];
  /** YouTube videos, appended after the images. */
  videos?: GalleryVideo[];
  name: string;
  /**
   * Map of variant option-value label → variant SKU. Used to resolve the
   * currently-selected variant from the (read-only) variant selector DOM,
   * since this component must not edit the variant selector itself.
   */
  variantLabelToSku?: Record<string, string>;
  /** Optional explicit selected SKU (overrides DOM detection when provided). */
  selectedSku?: string;
}

// The thumbnail strip always reserves THUMB_SLOTS fixed-width slots. With
// fewer assets the thumbs fill from the left and the remaining slots are just
// empty space. Above THUMB_SLOTS the strip becomes a scrollable carousel.
const THUMB_SLOTS = 6;
const CAROUSEL_THRESHOLD = THUMB_SLOTS;

// ─── alt-text variant model parsing ──────────────────────────────────────────
// Each BigCommerce image description encodes:  {sku} | {position} | {alt}
//   - {sku}      = variant SKU the image belongs to (optional)
//   - {position} = integer ordering within that variant's gallery (optional)
//   - {alt}      = the real alt text shown to the user (only this is rendered)
// Parse defensively: tolerate missing parts, extra/zero pipes, whitespace and
// malformed entries. If the alt does not match the model (no usable sku), the
// WHOLE alt becomes the display alt and the image stays in the unassigned set.

interface ParsedImage {
  url: string;
  /** The variant SKU this image belongs to, or null when unassigned. */
  sku: string | null;
  /** Explicit position within the variant gallery, or null. */
  position: number | null;
  /** Display-only alt text. */
  displayAlt: string;
  /** Natural BigCommerce load order. */
  sortOrder: number;
}

// Exported for unit testing of the alt-text variant-model parser.
export function parseGalleryImage(img: GalleryImage): ParsedImage {
  const raw = img.alt ?? "";
  const parts = raw.split("|");

  // No pipes at all → not following the model: whole string is the alt.
  if (parts.length < 2) {
    return {
      url: img.url,
      sku: null,
      position: null,
      displayAlt: raw.trim(),
      sortOrder: img.sortOrder,
    };
  }

  const sku = parts[0].trim();

  // Position is the second segment when it parses as a non-negative integer.
  // If it's not an integer, treat the model as {sku} | {alt} (no position) and
  // fold the remaining segments back into the alt.
  let position: number | null = null;
  let altParts: string[];
  const maybePos = parts[1].trim();
  if (maybePos !== "" && /^\d+$/.test(maybePos)) {
    position = parseInt(maybePos, 10);
    altParts = parts.slice(2);
  } else {
    altParts = parts.slice(1);
  }

  // Re-join any extra pipes that belonged to the alt text.
  const displayAlt = altParts.join("|").trim();

  return {
    url: img.url,
    sku: sku || null,
    position,
    displayAlt,
    sortOrder: img.sortOrder,
  };
}

// ─── asset model (image or video slide) ──────────────────────────────────────

type Slide =
  | { kind: "image"; url: string; alt: string }
  | { kind: "video"; id: string; title: string };

export function ImageGallery({
  galleryImages,
  videos,
  name,
  variantLabelToSku,
  selectedSku: selectedSkuProp,
}: ImageGalleryProps) {
  const parsedImages = useMemo(
    () => (galleryImages ?? []).map(parseGalleryImage),
    [galleryImages],
  );

  // ── Selected-variant detection ───────────────────────────────────────────
  // The variant selector is owned by another component and renders its options
  // as <button aria-pressed> elements whose text is the option-value label.
  // We resolve the active SKU by watching the document for the pressed button
  // and mapping its label through variantLabelToSku. An explicit selectedSku
  // prop, when supplied, always wins.
  const [detectedSku, setDetectedSku] = useState<string | null>(null);

  useEffect(() => {
    if (selectedSkuProp || !variantLabelToSku || !Object.keys(variantLabelToSku).length) {
      return;
    }
    // Normalize labels for tolerant matching.
    const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
    const lookup = new Map<string, string>();
    for (const [label, sku] of Object.entries(variantLabelToSku)) {
      lookup.set(norm(label), sku);
    }

    function resolve() {
      const pressed = document.querySelectorAll<HTMLElement>('button[aria-pressed="true"]');
      for (const btn of pressed) {
        const text = norm(btn.textContent ?? "");
        const sku = lookup.get(text);
        if (sku) {
          setDetectedSku(sku);
          return;
        }
      }
    }

    // NOTE: we deliberately do NOT call resolve() synchronously here. The
    // variant selector renders its first option as pre-pressed before any user
    // interaction, so an initial read would treat the page-load state as a
    // selection. Per spec, "no variant selected" must keep the default gallery,
    // so we only adopt a SKU once a real aria-pressed mutation fires (a click).
    const observer = new MutationObserver(resolve);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-pressed"],
      childList: true,
    });
    return () => observer.disconnect();
  }, [selectedSkuProp, variantLabelToSku]);

  const activeSku = selectedSkuProp ?? detectedSku;

  // Track the last non-empty visible set so a non-matching variant keeps the
  // currently-shown gallery instead of clearing it.
  const prevVisibleRef = useRef<ParsedImage[]>([]);

  // ── Build the visible image set for the active variant ────────────────────
  const visibleImages = useMemo<ParsedImage[]>(() => {
    const fallback = () => prevVisibleRef.current;

    if (activeSku) {
      const matched = parsedImages.filter((p) => p.sku === activeSku);
      if (matched.length) {
        // Order by explicit {position} first (when present), then sortOrder.
        return matched.slice().sort((a, b) => {
          const ap = a.position ?? Number.POSITIVE_INFINITY;
          const bp = b.position ?? Number.POSITIVE_INFINITY;
          if (ap !== bp) return ap - bp;
          return a.sortOrder - b.sortOrder;
        });
      }
      // No images match the selected variant → make NO change (keep current).
      const kept = fallback();
      if (kept.length) return kept;
      // Nothing was shown yet → fall through to the default set.
    }
    // No variant selected (or no prior set) → the default gallery, in order.
    return parsedImages.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  }, [activeSku, parsedImages]);

  useEffect(() => {
    if (visibleImages.length) prevVisibleRef.current = visibleImages;
  }, [visibleImages]);

  // ── Compose slides (images then videos) ───────────────────────────────────
  const slides = useMemo<Slide[]>(() => {
    const imageSlides: Slide[] = visibleImages.map((p) => ({
      kind: "image",
      url: p.url,
      alt: p.displayAlt || name,
    }));
    const videoSlides: Slide[] = (videos ?? []).map((v) => ({
      kind: "video",
      id: v.id,
      title: v.title,
    }));
    return [...imageSlides, ...videoSlides];
  }, [visibleImages, videos, name]);

  const hasRealAssets = slides.length > 0;
  // No real assets → a SINGLE "coming soon" placeholder (no multi-slot fallback).
  const total = hasRealAssets ? slides.length : 1;

  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Defer non-active thumbnail image loads until after first paint so they
  // don't contend with the main (LCP) image for network bandwidth on load.
  // The thumbnail buttons still render immediately (placeholder slots), so
  // there's no layout shift — only the <img> bytes wait one tick.
  const [thumbsReady, setThumbsReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setThumbsReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Clamp / reset the active index when the asset set changes (variant swap).
  useEffect(() => {
    setActiveIdx((i) => (i >= total ? 0 : i));
    setPlaying(false);
  }, [total, activeSku]);

  function go(idx: number) {
    setActiveIdx(idx);
    setPlaying(false);
  }
  function prev() {
    setActiveIdx((i) => (i - 1 + total) % total);
    setPlaying(false);
  }
  function next() {
    setActiveIdx((i) => (i + 1) % total);
    setPlaying(false);
  }

  const active = hasRealAssets ? slides[Math.min(activeIdx, slides.length - 1)] : null;
  const isCarousel = total > CAROUSEL_THRESHOLD;

  // Keep the active thumbnail scrolled into view in carousel mode.
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isCarousel) return;
    const strip = stripRef.current;
    if (!strip) return;
    const el = strip.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }, [activeIdx, isCarousel]);

  function scrollStrip(dir: -1 | 1) {
    const strip = stripRef.current;
    if (!strip) return;
    strip.scrollBy({ left: dir * strip.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Main stage */}
      <div
        style={{
          position: "relative",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-card)",
          overflow: "hidden",
          aspectRatio: "1 / 1",
          background: "var(--surface-2)",
        }}
      >
        {!active ? (
          <ProductPH label={name} style={{ width: "100%", height: "100%" }} />
        ) : active.kind === "image" ? (
          isOptimizable(active.url) ? (
            <Image
              src={active.url}
              alt={active.alt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              style={{ objectFit: "cover" }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={active.url}
              alt={active.alt}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )
        ) : playing ? (
          <iframe
            src={`https://www.youtube.com/embed/${active.id}?autoplay=1&rel=0`}
            title={active.title || `${name} video`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ width: "100%", height: "100%", border: 0, display: "block" }}
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            aria-label={`Play video: ${active.title || name}`}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: 0,
              padding: 0,
              cursor: "pointer",
              background: "#000",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://img.youtube.com/vi/${active.id}/hqdefault.jpg`}
              alt={active.title || `${name} video`}
              loading="eager"
              decoding="async"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <span
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%,-50%)",
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(0,0,0,.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "12px solid transparent",
                  borderBottom: "12px solid transparent",
                  borderLeft: "20px solid #fff",
                  marginLeft: 5,
                }}
              />
            </span>
          </button>
        )}

        {total > 1 && (
          <>
            <button onClick={prev} aria-label="Previous asset" style={navBtnStyle("left")}>
              ‹
            </button>
            <button onClick={next} aria-label="Next asset" style={navBtnStyle("right")}>
              ›
            </button>
            <div
              style={{
                position: "absolute",
                bottom: 10,
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(0,0,0,.45)",
                borderRadius: 10,
                padding: "2px 9px",
                fontSize: 11,
                color: "#fff",
                fontVariantNumeric: "tabular-nums",
                pointerEvents: "none",
              }}
            >
              {activeIdx + 1} / {total}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip — only when there are real assets (no fallback slots). */}
      {hasRealAssets && (
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}>
        {isCarousel && (
          <button onClick={() => scrollStrip(-1)} aria-label="Scroll thumbnails left" style={stripArrowStyle}>
            ‹
          </button>
        )}
        <div
          ref={stripRef}
          style={
            isCarousel
              ? {
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  scrollbarWidth: "none",
                  scrollSnapType: "x proximity",
                  flex: 1,
                }
              : {
                  // Always 6 fixed-width slots; fewer assets fill from the
                  // left and the rest stay empty (no stretching to full width).
                  display: "grid",
                  gridTemplateColumns: `repeat(${THUMB_SLOTS}, 1fr)`,
                  gap: 8,
                  flex: 1,
                }
          }
        >
          {Array.from({ length: total }, (_, i) => {
            const slide = hasRealAssets ? slides[i] : null;
            const isActive = activeIdx === i;
            return (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={
                  slide?.kind === "video"
                    ? `Play video: ${slide.title || name}`
                    : `View image ${i + 1}`
                }
                style={{
                  position: "relative",
                  border: `1.5px solid ${isActive ? "var(--ink)" : "var(--line)"}`,
                  borderRadius: "var(--radius)",
                  padding: 0,
                  overflow: "hidden",
                  cursor: "pointer",
                  aspectRatio: "1 / 1",
                  background: "var(--surface-2)",
                  outline: "none",
                  transition: "border-color .1s",
                  flex: isCarousel ? "0 0 64px" : undefined,
                  scrollSnapAlign: isCarousel ? "start" : undefined,
                }}
              >
                {!slide || (!thumbsReady && !isActive) ? (
                  <ProductPH label={`${i + 1}`} tone={i} style={{ width: "100%", height: "100%" }} />
                ) : slide.kind === "image" ? (
                  isOptimizable(slide.url) ? (
                    <Image
                      src={slide.url}
                      alt={slide.alt}
                      fill
                      loading="lazy"
                      sizes="64px"
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slide.url}
                      alt={slide.alt}
                      loading="lazy"
                      decoding="async"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://img.youtube.com/vi/${slide.id}/hqdefault.jpg`}
                      alt={slide.title || `${name} video`}
                      loading="lazy"
                      decoding="async"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%,-50%)",
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "rgba(0,0,0,.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <span
                        style={{
                          width: 0,
                          height: 0,
                          borderTop: "5px solid transparent",
                          borderBottom: "5px solid transparent",
                          borderLeft: "8px solid #fff",
                          marginLeft: 2,
                        }}
                      />
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
        {isCarousel && (
          <button onClick={() => scrollStrip(1)} aria-label="Scroll thumbnails right" style={stripArrowStyle}>
            ›
          </button>
        )}
      </div>
      )}
    </div>
  );
}

function navBtnStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    [side]: 10,
    top: "50%",
    transform: "translateY(-50%)",
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "rgba(255,255,255,.92)",
    border: "1px solid var(--line)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
    color: "var(--ink)",
    boxShadow: "0 2px 8px rgba(0,0,0,.1)",
    padding: 0,
    zIndex: 2,
  };
}

const stripArrowStyle: React.CSSProperties = {
  flex: "0 0 auto",
  width: 24,
  height: 24,
  borderRadius: "50%",
  border: "1px solid var(--line)",
  background: "var(--surface)",
  cursor: "pointer",
  fontSize: 14,
  lineHeight: 1,
  color: "var(--ink)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};
