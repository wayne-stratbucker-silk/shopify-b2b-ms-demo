"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import {
  Style,
  TextInput,
  TextArea,
  RichText,
  Image,
  Select,
  Checkbox,
  Group,
  List,
  Shape,
} from "@makeswift/runtime/controls";
import { Icon } from "@/components/ui/icons";
import { MSImage } from "@/components/makeswift/ms-image";
import { ctaClass, type CtaStyle } from "@/lib/makeswift/cta-class";

interface TrainingCard {
  heading?: string;
  body?: string;
  image?: unknown;
  imageAlt?: string;
  ctaLabel?: string;
  ctaHref?: string;
  openInNewTab?: boolean;
}

interface TrainingSectionsProps {
  className?: string;
  // Inline RichText (top-level)
  eyebrow?: ReactNode;
  heading?: ReactNode;
  intro?: ReactNode;
  layout?: {
    desktopColumns?: "2" | "3" | "4";
    cardStyle?: "default" | "elevated";
    ctaStyle?: CtaStyle;
  };
  cards?: TrainingCard[];
}

function TrainingSections({
  className,
  eyebrow,
  heading,
  intro,
  layout,
  cards,
}: TrainingSectionsProps) {
  const { desktopColumns = "3", cardStyle = "default", ctaStyle = "secondary" } = layout ?? {};
  const items = useMemo<TrainingCard[]>(() => cards ?? [], [cards]);

  const [mobile, setMobile] = useState(false);
  const [tablet, setTablet] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mqMobile = window.matchMedia("(max-width: 480px)");
    const mqTablet = window.matchMedia("(max-width: 900px)");
    const u1 = () => setMobile(mqMobile.matches);
    const u2 = () => setTablet(mqTablet.matches);
    u1();
    u2();
    mqMobile.addEventListener("change", u1);
    mqTablet.addEventListener("change", u2);
    return () => {
      mqMobile.removeEventListener("change", u1);
      mqTablet.removeEventListener("change", u2);
    };
  }, []);

  const cols = mobile ? 1 : tablet ? 2 : Math.max(2, Math.min(4, parseInt(desktopColumns, 10) || 3));

  return (
    <section className={`ts-section ${className ?? ""}`}>
      <style>{TS_CSS}</style>
      <div className="container">
        <div className="ts-head">
          <div className="ts-eyebrow eyebrow">{eyebrow}</div>
          <h2 className="ts-heading">{heading}</h2>
          <div className="ts-intro">{intro}</div>
        </div>

        {items.length === 0 ? (
          <div className="ts-empty">
            Add training cards in the Makeswift editor to get started.
          </div>
        ) : (
          <div
            className={`ts-grid ts-grid--${cardStyle}`}
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {items.map((card, i) => {
              const href = card.ctaHref?.trim() || "";
              const isExternal = /^https?:/i.test(href);
              const newTab =
                card.openInNewTab ?? isExternal;
              return (
                <article key={`${card.heading ?? "card"}-${i}`} className="ts-card">
                  <div className="ts-card-media">
                    <MSImage
                      src={card.image}
                      alt={card.imageAlt || card.heading || ""}
                      sizes="(max-width: 480px) 100vw, (max-width: 900px) 50vw, 33vw"
                      aspectRatio="16/9"
                      fallback="stripes"
                      objectFit="cover"
                    />
                  </div>
                  <div className="ts-card-body">
                    {card.heading && <h3 className="ts-card-heading">{card.heading}</h3>}
                    {card.body && <p className="ts-card-body-text">{card.body}</p>}
                    {card.ctaLabel && href ? (
                      <a
                        href={href}
                        className={`${ctaClass(ctaStyle, "secondary", "btn-sm")} ts-card-cta`}
                        target={newTab ? "_blank" : undefined}
                        rel={newTab ? "noopener noreferrer" : undefined}
                      >
                        {card.ctaLabel}
                        <Icon name="arrow" size={13} />
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

const TS_CSS = `
.ts-section { width: 100%; padding: 56px 0; color: var(--ink); background: var(--bg); }
.ts-section .container { display: flex; flex-direction: column; gap: 28px; }

.ts-head { display: flex; flex-direction: column; gap: 10px; max-width: 720px; }
.ts-eyebrow { display: inline-flex; align-items: center; gap: 10px; }
.ts-eyebrow:empty { display: none; }
.ts-heading { font-family: var(--font-display); font-size: 32px; font-weight: 600; letter-spacing: -.02em; line-height: 1.1; margin: 0; color: var(--ink); }
.ts-heading:empty { display: none; }
.ts-intro { color: var(--muted); font-size: 14px; line-height: 1.55; }
.ts-intro:empty { display: none; }

.ts-empty {
  padding: 48px 24px; text-align: center; color: var(--muted); font-size: 14px;
  background: var(--surface); border-radius: var(--radius-card); border: 1px dashed var(--line-2);
}

.ts-grid { display: grid; gap: 24px; }

.ts-card {
  display: flex; flex-direction: column;
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-card);
  overflow: hidden; transition: border-color .15s, box-shadow .15s, transform .15s;
}
.ts-card:hover { border-color: var(--ink-2); box-shadow: var(--shadow-md); }
.ts-grid--elevated .ts-card { box-shadow: var(--shadow-sm); }
.ts-grid--elevated .ts-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }

.ts-card-media { position: relative; aspect-ratio: 16/9; background: var(--bg-alt); }
.ts-card-body { padding: 20px 22px 22px; display: flex; flex-direction: column; gap: 10px; flex: 1 1 auto; }
.ts-card-heading {
  font-family: var(--font-display); font-size: 18px; font-weight: 600; letter-spacing: -.01em;
  line-height: 1.3; margin: 0; color: var(--ink);
}
.ts-card-body-text { font-size: 13px; line-height: 1.55; color: var(--muted); margin: 0; }
.ts-card-cta { margin-top: auto; align-self: flex-start; text-decoration: none; }

@media (max-width: 900px) {
  .ts-section { padding: 40px 0; }
  .ts-heading { font-size: 26px; }
  .ts-grid { gap: 18px; }
  .ts-card-body { padding: 18px 18px 20px; }
}
@media (max-width: 480px) {
  .ts-section { padding: 32px 0; }
  .ts-heading { font-size: 22px; }
  .ts-grid { gap: 16px; }
  .ts-card-heading { font-size: 16px; }
}
`;

runtime.registerComponent(TrainingSections, {
  type: "acme-training-sections",
  label: "Content / Training Sections",
  props: {
    className: Style(),

    // Inline RichText at top-level (per-card heading/body must be plain
    // TextInput/TextArea since they live inside a List/Shape).
    eyebrow: RichText({ mode: RichText.Mode.Inline, defaultValue: "Training" }),
    heading: RichText({
      mode: RichText.Mode.Inline,
      defaultValue: "Sharpen your team's skills.",
    }),
    intro: RichText({
      mode: RichText.Mode.Inline,
      defaultValue:
        "On-demand courses, in-person clinics, and certifications run by ACME's product engineers and training partners.",
    }),

    layout: Group({
      label: "Layout",
      preferredLayout: Group.Layout.Popover,
      props: {
        desktopColumns: Select({
          label: "Columns (desktop)",
          options: [
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4", value: "4" },
          ],
          defaultValue: "3",
        }),
        cardStyle: Select({
          label: "Card style",
          options: [
            { label: "Default", value: "default" },
            { label: "Elevated (shadow + lift on hover)", value: "elevated" },
          ],
          defaultValue: "default",
        }),
        ctaStyle: Select({
          label: "CTA button style",
          options: [
            { label: "Primary (filled)", value: "primary" },
            { label: "Secondary (ghost)", value: "secondary" },
          ],
          defaultValue: "secondary",
        }),
      },
    }),

    cards: List({
      label: "Training cards",
      type: Shape({
        type: {
          image: Image({ label: "Card image (16:9 looks best)" }),
          imageAlt: TextInput({ label: "Image alt text", defaultValue: "" }),
          heading: TextInput({
            label: "Card heading",
            defaultValue: "Lighting fundamentals — 101",
          }),
          body: TextArea({
            label: "Card body",
            defaultValue:
              "A 60-minute primer for new project managers and inside sales reps. Cover lumens, color temperature, and dimming basics.",
          }),
          ctaLabel: TextInput({ label: "CTA label", defaultValue: "Learn more" }),
          ctaHref: TextInput({
            label: "CTA URL (internal /path or full https:// URL)",
            defaultValue: "https://",
          }),
          openInNewTab: Checkbox({
            label: "Open in new tab (defaults to ON for external URLs)",
            defaultValue: true,
          }),
        },
      }),
      getItemLabel: (item) => {
        const i = item as TrainingCard | undefined;
        return i?.heading?.trim() || "Training card";
      },
    }),
  },
});

export default TrainingSections;
