"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import {
  Style,
  TextInput,
  TextArea,
  List,
  Shape,
  Number as NumberCtrl,
  Select,
  Checkbox,
} from "@makeswift/runtime/controls";

interface Testimonial {
  quote?: string;
  authorName?: string;
  authorRole?: string;
  authorCompany?: string;
  initials?: string;
  rating?: number;
}

interface TestimonialWidgetProps {
  className?: string;
  eyebrow?: string;
  title?: string;
  titleEmphasis?: string;
  desktopColumns?: string; // "2" | "3" | "4"
  autoplay?: boolean;
  interval?: number; // seconds
  testimonials?: Testimonial[];
}

const pad = (n: number) => String(n).padStart(2, "0");

function deriveInitials(name?: string): string {
  if (!name) return "";
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Stars({ rating = 5 }: { rating?: number }) {
  return (
    <span className="tw-stars">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          fill="currentColor"
          className={i < rating ? "on" : "off"}
        >
          <path d="M12 2 15.09 8.26 22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
        </svg>
      ))}
    </span>
  );
}

function Card({ item }: { item: Testimonial }) {
  const initials = item.initials || deriveInitials(item.authorName);
  return (
    <article className="tw-card">
      <span className="corner-mark">&ldquo;</span>
      <Stars rating={item.rating ?? 5} />
      <blockquote>{item.quote}</blockquote>
      <div className="foot">
        <div className="tw-author">
          {initials && <span className="av">{initials}</span>}
          <div className="meta">
            {item.authorName && <span className="name">{item.authorName}</span>}
            {(item.authorRole || item.authorCompany) && (
              <span className="role">
                {item.authorRole}
                {item.authorRole && item.authorCompany ? ", " : ""}
                {item.authorCompany && <span className="co">{item.authorCompany}</span>}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function TestimonialWidget({
  className,
  eyebrow,
  title,
  titleEmphasis,
  desktopColumns = "3",
  autoplay = true,
  interval = 6,
  testimonials,
}: TestimonialWidgetProps) {
  const items = useMemo(() => testimonials ?? [], [testimonials]);

  // Responsive: 1-up + tighter spacing under 768px, otherwise the configured
  // desktop column count.
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const pageSize = mobile ? 1 : Math.max(1, parseInt(desktopColumns, 10) || 3);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const [hover, setHover] = useState(false);

  // Keep the active page valid when pageSize/pageCount change (e.g. on resize).
  useEffect(() => {
    setActive((a) => Math.min(a, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    setPlaying(autoplay);
  }, [autoplay]);

  const intervalMs = Math.max(1, interval) * 1000;
  useEffect(() => {
    if (!playing || hover || pageCount <= 1) return;
    const id = setTimeout(() => setActive((a) => (a + 1) % pageCount), intervalMs);
    return () => clearTimeout(id);
  }, [active, playing, hover, intervalMs, pageCount]);

  // Touch swipe
  const touch = useRef({ x: 0, dx: 0 });
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, dx: 0 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touch.current.dx = e.touches[0].clientX - touch.current.x;
  };
  const onTouchEnd = () => {
    const { dx } = touch.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) setActive((a) => (a + 1) % pageCount);
      else setActive((a) => (a - 1 + pageCount) % pageCount);
    }
  };

  const next = useCallback(() => setActive((a) => (a + 1) % pageCount), [pageCount]);
  const prev = useCallback(
    () => setActive((a) => (a - 1 + pageCount) % pageCount),
    [pageCount],
  );

  const gap = mobile ? 16 : 24;

  if (!items.length) {
    return (
      <section className={className ?? ""}>
        <div
          style={{
            maxWidth: 1360,
            margin: "0 auto",
            padding: "56px 32px",
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 14,
          }}
        >
          Add testimonials in the Makeswift editor to get started.
        </div>
      </section>
    );
  }

  return (
    <section
      className={`tw ${mobile ? "mobile" : ""} ${className ?? ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <style>{TW_CSS}</style>
      <div className="tw-inner">
        <div className="tw-head">
          <div className="tw-head-l">
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {(title || titleEmphasis) && (
              <h2>
                {title}
                {title && titleEmphasis ? " " : ""}
                {titleEmphasis && <em>{titleEmphasis}</em>}
              </h2>
            )}
          </div>
          {pageCount > 1 && (
            <div className="tw-controls">
              <div className="tw-counter">
                <span className="cur">{pad(active + 1)}</span>
                <span className="sep">/</span>
                <span>{pad(pageCount)}</span>
              </div>
              <button className="tw-arrow" onClick={prev} aria-label="Previous">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button className="tw-arrow" onClick={next} aria-label="Next">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>
              <button
                className="tw-arrow tw-playpause"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? "Pause carousel" : "Play carousel"}
                title={playing ? "Pause" : "Play"}
              >
                {playing ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="7" y="5" width="3.5" height="14" rx="1" />
                    <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>

        <div
          className="tw-viewport"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="tw-track"
            style={{
              gridAutoColumns: `calc((100% - ${(pageSize - 1) * gap}px) / ${pageSize})`,
              transform: `translateX(calc(${-active * 100}% - ${active * gap}px))`,
            }}
          >
            {items.map((it, i) => (
              <Card key={i} item={it} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Co-located styles (hover/transition/pseudo-elements can't be inline). Scoped
// under `.tw`; all colors/fonts reuse the site's existing design tokens.
const TW_CSS = `
.tw { width: 100%; position: relative; color: var(--ink); background: var(--surface); }
.tw .tw-inner { max-width: 1360px; margin: 0 auto; padding: 0 32px; }

.tw .tw-head { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 32px; margin-bottom: 28px; }
.tw .tw-head-l { display: flex; flex-direction: column; gap: 10px; max-width: 640px; }
.tw .tw-head .eyebrow {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: .1em;
  color: var(--muted); text-transform: uppercase;
  display: inline-flex; align-items: center; gap: 10px;
}
.tw .tw-head .eyebrow::before { content: ""; width: 22px; height: 1px; background: var(--line-2); }
.tw .tw-head h2 {
  font-family: var(--font-display); font-size: 32px; font-weight: 600; letter-spacing: -.02em;
  line-height: 1.1; margin: 0; color: var(--ink); text-wrap: pretty; max-width: 18ch;
}
.tw .tw-head h2 em { font-style: normal; color: var(--muted); font-weight: 600; }

.tw .tw-controls { display: inline-flex; align-items: center; gap: 12px; }
.tw .tw-arrow {
  width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--line-2);
  background: var(--surface); display: inline-flex; align-items: center; justify-content: center;
  color: var(--ink-2); cursor: pointer; font-family: inherit; padding: 0;
  transition: background .12s, border-color .12s, color .12s;
}
.tw .tw-arrow:hover { background: var(--bg-alt); border-color: var(--ink-2); color: var(--ink); }
.tw .tw-arrow svg { width: 16px; height: 16px; }

.tw .tw-counter {
  font-family: var(--font-mono); font-size: 12px; color: var(--muted);
  display: inline-flex; align-items: baseline; gap: 4px; min-width: 52px; justify-content: center;
}
.tw .tw-counter .cur { color: var(--ink); font-weight: 600; font-size: 13px; }
.tw .tw-counter .sep { color: var(--muted-2); }

.tw .tw-stars { display: inline-flex; gap: 2px; align-items: center; }
.tw .tw-stars svg { width: 13px; height: 13px; }
.tw .tw-stars svg.on { color: var(--ink); }
.tw .tw-stars svg.off { color: var(--line-2); }

.tw .tw-author { display: flex; align-items: center; gap: 12px; }
.tw .tw-author .av {
  width: 38px; height: 38px; border-radius: 50%; background: var(--bg-alt); color: var(--ink-2);
  display: inline-flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 13px; flex-shrink: 0; border: 1px solid var(--line);
}
.tw .tw-author .meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.tw .tw-author .name { font-size: 13px; font-weight: 600; color: var(--ink); letter-spacing: -.005em; line-height: 1.2; }
.tw .tw-author .role { font-size: 12px; color: var(--muted); line-height: 1.4; }
.tw .tw-author .role .co { color: var(--ink-2); font-weight: 500; }

.tw .tw-viewport { overflow: hidden; position: relative; }
.tw .tw-track {
  display: grid; grid-auto-flow: column; gap: 24px;
  transition: transform .42s cubic-bezier(.4, 0, .2, 1); will-change: transform;
}

.tw .tw-card {
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-card);
  padding: 28px; display: flex; flex-direction: column; gap: 18px; min-height: 320px;
  position: relative; transition: border-color .15s, box-shadow .15s;
}
.tw .tw-card:hover { border-color: var(--ink-2); box-shadow: var(--shadow-md); }
.tw .tw-card blockquote {
  font-family: var(--font-display); font-size: 16px; font-weight: 500;
  line-height: 1.55; letter-spacing: -.005em; color: var(--ink); margin: 0; flex: 1; text-wrap: pretty;
}
.tw .tw-card .corner-mark {
  position: absolute; top: 22px; right: 22px; font-family: var(--font-display);
  font-size: 56px; line-height: 0.5; color: var(--bg-alt); font-weight: 500;
  user-select: none; letter-spacing: -.04em; pointer-events: none;
}
.tw .tw-card .foot { padding-top: 18px; border-top: 1px solid var(--line); }

.tw.mobile .tw-inner { padding: 0 16px; }
.tw.mobile .tw-head { grid-template-columns: 1fr; gap: 16px; margin-bottom: 20px; }
.tw.mobile .tw-head h2 { font-size: 24px; max-width: none; }
.tw.mobile .tw-track { gap: 16px; }
.tw.mobile .tw-card { padding: 22px; min-height: 280px; }
.tw.mobile .tw-card blockquote { font-size: 15px; }
.tw.mobile .tw-arrow { width: 36px; height: 36px; }
`;

runtime.registerComponent(TestimonialWidget, {
  type: "acme-testimonial-widget",
  label: "Content / Testimonial Widget",
  props: {
    className: Style(),
    eyebrow: TextInput({ label: "Eyebrow", defaultValue: "From the field" }),
    title: TextInput({ label: "Title", defaultValue: "What contractors say" }),
    titleEmphasis: TextInput({
      label: "Title emphasis",
      defaultValue: "after switching.",
    }),
    desktopColumns: Select({
      label: "Cards per page (desktop)",
      options: [
        { value: "2", label: "2" },
        { value: "3", label: "3" },
        { value: "4", label: "4" },
      ],
      defaultValue: "3",
    }),
    autoplay: Checkbox({ label: "Autoplay", defaultValue: true }),
    interval: NumberCtrl({ label: "Autoplay interval (sec)", defaultValue: 6, min: 1, step: 1 }),
    testimonials: List({
      label: "Testimonials",
      type: Shape({
        type: {
          quote: TextArea({
            label: "Quote",
            defaultValue:
              "The Quick Order pad saves my desk crew six hours every Monday. Paste part numbers from job sheets, hit submit, on the truck Tuesday.",
          }),
          authorName: TextInput({ label: "Author name", defaultValue: "Marcus Reyes" }),
          authorRole: TextInput({ label: "Author role", defaultValue: "Operations Manager" }),
          authorCompany: TextInput({ label: "Company", defaultValue: "Bristol Electric" }),
          initials: TextInput({ label: "Avatar initials (optional)" }),
          rating: NumberCtrl({ label: "Star rating", defaultValue: 5, min: 0, max: 5, step: 1 }),
        },
      }),
      getItemLabel: (item) => {
        const i = item as Testimonial | undefined;
        return i?.authorName || "Testimonial";
      },
    }),
  },
});
