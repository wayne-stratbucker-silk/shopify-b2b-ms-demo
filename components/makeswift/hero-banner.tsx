"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import {
  Style, TextInput, Checkbox, Select, Number, Image, List, Shape, Link,
} from "@makeswift/runtime/controls";
import { MSImage, toUrl } from "@/components/makeswift/ms-image";
import { AltTextNotice } from "@/components/makeswift/builder-notice";
import { isAltMissing } from "@/lib/seo-audit";
import { ctaClass, type CtaStyle } from "@/lib/makeswift/cta-class";
import { linkProps, type MSLink } from "@/lib/makeswift/link";

type MediaType = "none" | "image" | "video";

interface SlideData {
  // Display copy — every slide (including the first) comes from the slides List,
  // so these are always plain strings edited in the side panel.
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  primaryCtaLabel?: string;
  primaryCtaLink?: MSLink;
  primaryCtaStyle?: CtaStyle;
  secondaryCtaLabel?: string;
  secondaryCtaLink?: MSLink;
  secondaryCtaStyle?: CtaStyle;
  showTrustBar?: boolean;
  stat1num?: string; stat1label?: string;
  stat2num?: string; stat2label?: string;
  stat3num?: string; stat3label?: string;
  stat4num?: string; stat4label?: string;
  mediaType?: MediaType;
  mediaImage?: unknown;
  mediaImageAlt?: string;
  mediaImageDecorative?: boolean;
  mediaVideoUrl?: string;
  mediaVideoLoop?: boolean;
  mediaVideoPoster?: unknown;
}

function SlideContent({ slide, priority }: { slide: SlideData; priority: boolean }) {
  const stats = [
    { num: slide.stat1num ?? "14,200+", label: slide.stat1label ?? "In-stock SKUs" },
    { num: slide.stat2num ?? "14",      label: slide.stat2label ?? "Stocking locations" },
    { num: slide.stat3num ?? "98.4%",   label: slide.stat3label ?? "On-time fill rate" },
    { num: slide.stat4num ?? "$250K",   label: slide.stat4label ?? "Your credit line" },
  ];

  const mediaImage = toUrl(slide.mediaImage);
  const mediaVideoPoster = toUrl(slide.mediaVideoPoster);
  // Auto-detect the effective media type — uploading an image without flipping
  // the dropdown still works.
  const mediaType: MediaType =
    slide.mediaType && slide.mediaType !== "none"
      ? slide.mediaType
      : mediaImage
        ? "image"
        : slide.mediaVideoUrl
          ? "video"
          : "none";
  const showMedia = mediaType !== "none";

  return (
    <div className={`hero-banner-grid ${showMedia ? "" : "hero-banner-grid--solo"}`}>
      <div className="hero-banner-copy">
        {slide.eyebrow && <span className="hero-eyebrow">{slide.eyebrow}</span>}
        {slide.heading && (
          <h1 className="hero-banner-title">{slide.heading}</h1>
        )}
        {slide.subheading && (
          <p className="hero-banner-sub">{slide.subheading}</p>
        )}
        <div className="hero-banner-cta">
          {slide.primaryCtaLabel && (
            <a {...linkProps(slide.primaryCtaLink)} className={ctaClass(slide.primaryCtaStyle, "primary", "btn-lg")}>
              {slide.primaryCtaLabel} →
            </a>
          )}
          {slide.secondaryCtaLabel && (
            <a {...linkProps(slide.secondaryCtaLink)} className={ctaClass(slide.secondaryCtaStyle, "secondary", "btn-lg")}>
              {slide.secondaryCtaLabel}
            </a>
          )}
        </div>
        {slide.showTrustBar && (
          <div className="hero-trust">
            {stats.map(({ num, label }) => (
              <div key={label}>
                <span className="tnum">{num}</span>
                {label}
              </div>
            ))}
          </div>
        )}
      </div>

      {showMedia && (
        <div className="hero-banner-media">
          {mediaType === "image" && mediaImage && (
            <MSImage
              src={mediaImage}
              alt={slide.mediaImageDecorative ? "" : (slide.mediaImageAlt?.trim() || slide.heading || "")}
              priority={priority}
              sizes="(max-width: 768px) 100vw, 55vw"
              quality={75}
              style={{ position: "absolute", inset: 0 }}
            />
          )}
          {mediaType === "video" && slide.mediaVideoUrl && (
            <video
              src={slide.mediaVideoUrl}
              poster={mediaVideoPoster}
              autoPlay
              muted
              playsInline
              loop={slide.mediaVideoLoop !== false}
              preload="metadata"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
          {(!mediaImage && !slide.mediaVideoUrl) && (
            <div className="hero-banner-media-empty">
              <span className="hero-banner-media-empty-label">
                {mediaType === "video" ? "VIDEO / upload url above" : "IMAGE / upload in panel →"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HeroBanner({
  // Every slide — including the first — comes from the slides List, so the
  // first slide is added and edited exactly like the rest (mirrors the
  // Shoppable Diagram's scenes). No content is special-cased at the top level.
  slides,
  autoplay,
  autoplayInterval,
  className,
}: {
  slides?: SlideData[];
  autoplay?: boolean;
  autoplayInterval?: number;
  className?: string;
}) {
  const allSlides: SlideData[] = slides ?? [];
  const slideCount = allSlides.length;
  // Builder-only: which authored slides have an image set but no dedicated alt.
  const altIssues = allSlides
    .map((s, i) => (isAltMissing(s.mediaImage, s.mediaImageAlt, s.mediaImageDecorative) ? `Slide ${i + 1}` : null))
    .filter((x): x is string => x !== null);
  const [current, setCurrent] = useState(0);
  // Track the slide we're transitioning from so we can crossfade between the
  // two during the brief transition window.
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const isCarousel = slideCount > 1;

  // Keep `current` valid if the editor removes slides while we're on a later one.
  const safeCurrent = current < slideCount ? current : 0;
  const slide = allSlides[safeCurrent] ?? {};

  const [paused, setPaused] = useState(false);
  const [interactionTick, setInteractionTick] = useState(0);

  const goTo = useCallback(
    (i: number) => {
      setCurrent((c) => {
        const target = ((i % slideCount) + slideCount) % slideCount;
        if (target !== c) setPrevIndex(c);
        return target;
      });
    },
    [slideCount],
  );

  const prev = useCallback(() => {
    setCurrent((c) => {
      setPrevIndex(c);
      return (c - 1 + slideCount) % slideCount;
    });
    setInteractionTick((t) => t + 1);
  }, [slideCount]);

  const next = useCallback(() => {
    setCurrent((c) => {
      setPrevIndex(c);
      return (c + 1) % slideCount;
    });
    setInteractionTick((t) => t + 1);
  }, [slideCount]);

  const goToInteractive = useCallback(
    (i: number) => {
      goTo(i);
      setInteractionTick((t) => t + 1);
    },
    [goTo],
  );

  useEffect(() => {
    if (prevIndex === null) return;
    const t = setTimeout(() => setPrevIndex(null), 320);
    return () => clearTimeout(t);
  }, [prevIndex, safeCurrent]);

  useEffect(() => {
    if (!autoplay || !isCarousel || paused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const intervalMs = Math.max(2, autoplayInterval ?? 6) * 1000;
    const id = setInterval(() => {
      setCurrent((c) => {
        setPrevIndex(c);
        return (c + 1) % slideCount;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [autoplay, autoplayInterval, isCarousel, paused, slideCount, interactionTick]);

  const touchStartX = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 40;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
    setPaused(true);
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const startX = touchStartX.current;
      touchStartX.current = null;
      setPaused(false);
      if (startX === null) return;
      const endX = e.changedTouches[0]?.clientX ?? startX;
      const dx = endX - startX;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      if (dx < 0) next();
      else prev();
    },
    [next, prev],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isCarousel) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    },
    [isCarousel, next, prev],
  );

  const fromSlide = prevIndex !== null ? allSlides[prevIndex] : null;

  if (slideCount === 0) {
    return (
      <section className={`hero ${className ?? ""}`}>
        <div className="container">
          <div className="hero-banner-empty">
            Add a slide in the Makeswift editor to configure this Hero Banner.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`hero ${className ?? ""}`}>
      <div className="container">
        <AltTextNotice items={altIssues} />
        <div
          className="hero-banner-stage"
          {...(isCarousel
            ? {
                role: "group",
                "aria-roledescription": "carousel",
                "aria-label": "Hero carousel",
                tabIndex: 0,
                onKeyDown,
                onMouseEnter: () => setPaused(true),
                onMouseLeave: () => setPaused(false),
                onTouchStart,
                onTouchEnd,
              }
            : {})}
        >
          {isCarousel ? (
            <div className="hero-banner-stack" aria-live={autoplay ? "off" : "polite"}>
              {/* Outgoing slide (crossfade source) */}
              {fromSlide && (
                <div
                  key={`from-${prevIndex}`}
                  aria-hidden="true"
                  className="hero-slide hero-slide-out"
                >
                  <SlideContent slide={fromSlide} priority={false} />
                </div>
              )}
              {/* Active slide — the first slide is the LCP candidate */}
              <div
                key={`current-${safeCurrent}`}
                className="hero-slide hero-slide-in"
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${safeCurrent + 1} of ${slideCount}`}
              >
                <SlideContent slide={slide} priority={safeCurrent === 0} />
              </div>
            </div>
          ) : (
            <SlideContent slide={slide} priority />
          )}

          {isCarousel && (
            <div className="hero-banner-controls">
              <button
                onClick={prev}
                className="btn btn-ghost btn-sm hero-banner-arrow"
                aria-label="Previous slide"
              >
                ←
              </button>

              <div className="hero-banner-dots" role="tablist">
                {allSlides.map((_, i) => (
                  <button
                    key={i}
                    role="tab"
                    onClick={() => goToInteractive(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-selected={i === safeCurrent}
                    className={`hero-banner-dot ${i === safeCurrent ? "is-active" : ""}`}
                  />
                ))}
              </div>

              <button
                onClick={next}
                className="btn btn-ghost btn-sm hero-banner-arrow"
                aria-label="Next slide"
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const ctaStyleSelect = (label: string, defaultValue: CtaStyle) =>
  Select({
    label,
    options: [
      { label: "Primary", value: "primary" },
      { label: "Secondary", value: "secondary" },
    ],
    defaultValue,
  });

// Every slide (including the first) is one item of this Shape. Defaults mirror
// the previous hard-coded "slide 1" so a freshly-added slide looks like the
// original hero out of the box.
const SLIDE_SHAPE = Shape({
  type: {
    eyebrow: TextInput({ label: "Eyebrow", defaultValue: "Spring 2026 · Contractor Pricing Live" }),
    heading: TextInput({ label: "Heading", defaultValue: "Industrial lighting & electrical, at trade." }),
    subheading: TextInput({ label: "Subheading", defaultValue: "14,200+ contractor-priced SKUs in stock." }),
    primaryCtaLabel: TextInput({ label: "Primary button label", defaultValue: "Shop LED fixtures" }),
    primaryCtaLink: Link({ label: "Primary button link" }),
    primaryCtaStyle: ctaStyleSelect("Primary button style", "primary"),
    secondaryCtaLabel: TextInput({ label: "Secondary button label", defaultValue: "Quick order by SKU" }),
    secondaryCtaLink: Link({ label: "Secondary button link" }),
    secondaryCtaStyle: ctaStyleSelect("Secondary button style", "secondary"),
    showTrustBar: Checkbox({ label: "Show trust bar", defaultValue: true }),
    stat1num: TextInput({ label: "Stat 1 — number", defaultValue: "14,200+" }),
    stat1label: TextInput({ label: "Stat 1 — label", defaultValue: "In-stock SKUs" }),
    stat2num: TextInput({ label: "Stat 2 — number", defaultValue: "14" }),
    stat2label: TextInput({ label: "Stat 2 — label", defaultValue: "Stocking locations" }),
    stat3num: TextInput({ label: "Stat 3 — number", defaultValue: "98.4%" }),
    stat3label: TextInput({ label: "Stat 3 — label", defaultValue: "On-time fill rate" }),
    stat4num: TextInput({ label: "Stat 4 — number", defaultValue: "$250K" }),
    stat4label: TextInput({ label: "Stat 4 — label", defaultValue: "Your credit line" }),
    mediaType: Select({
      label: "Media type",
      options: [
        { label: "None (copy only)", value: "none" },
        { label: "Image", value: "image" },
        { label: "Video (autoplay)", value: "video" },
      ],
      defaultValue: "none",
    }),
    mediaImage: Image({ label: "Image", format: Image.Format.URL }),
    mediaImageAlt: TextInput({ label: "Image alt text (accessibility)", defaultValue: "" }),
    mediaImageDecorative: Checkbox({ label: "Decorative image (no alt needed)", defaultValue: false }),
    mediaVideoUrl: TextInput({ label: "Video URL (.mp4 / .webm)" }),
    mediaVideoLoop: Checkbox({ label: "Loop video", defaultValue: true }),
    mediaVideoPoster: Image({ label: "Video poster (first frame)", format: Image.Format.URL }),
  },
});

runtime.registerComponent(HeroBanner, {
  type: "acme-hero-banner",
  label: "Banners & Ads / Hero Banner",
  props: {
    className: Style(),

    // Every slide — including the first — is managed here in the slides List, so
    // they're all added and edited the same way (mirrors the Shoppable Diagram's
    // scenes). List/Shape items are edited in the side panel: Makeswift can't
    // inline-edit content nested in a List, so there is no top-level "slide 1".
    slides: List({
      label: "Slides",
      type: SLIDE_SHAPE,
      getItemLabel: (item) => (item as { heading?: string })?.heading?.trim() || "Slide",
    }),

    autoplay: Checkbox({ label: "Auto-advance slides", defaultValue: false }),
    autoplayInterval: Number({ label: "Auto-advance interval (seconds)", defaultValue: 6 }),
  },
});
