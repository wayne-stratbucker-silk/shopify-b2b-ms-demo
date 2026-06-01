"use client";

import { useMemo, useState, type ReactNode } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import {
  Style,
  TextInput,
  TextArea,
  RichText,
  Select,
  Checkbox,
  Number as MSNumber,
  Group,
  List,
  Shape,
  Link,
} from "@makeswift/runtime/controls";
import { Icon } from "@/components/ui/icons";
import { ctaClass, type CtaStyle } from "@/lib/makeswift/cta-class";
import { linkProps, type MSLink } from "@/lib/makeswift/link";
import { EditableRegion } from "@/lib/makeswift/editable";

// ─────────────────────────────────────────────────────────────────────────────
// Accordion FAQ — three layouts (stack | split | boxed) matching the demo at
// /tmp/faq-designs FAQ Desktop.html + FAQ Mobile.html. Class names mirror the
// source CSS verbatim so the embedded <style> below is a near 1:1 copy. Mobile
// deltas (≤880px) live in a single media query at the bottom of FAQ_CSS.
// ─────────────────────────────────────────────────────────────────────────────

interface FaqItem {
  question?: string;
  answer?: string;
  linkLabel?: string;
  link?: MSLink;
}

interface FaqSectionProps {
  className?: string;
  eyebrowRt?: ReactNode;
  headingRt?: ReactNode;
  introRt?: ReactNode;
  layout?: {
    variant?: "stack" | "split" | "boxed";
    align?: "left" | "center";
    toggleIcon?: "plusminus" | "chev";
    multiOpen?: boolean;
    defaultOpenIndex?: number;
    showHelp?: boolean;
  };
  items?: FaqItem[];
  help?: {
    helpLead?: string;
    helpBody?: string;
  };
  buttons?: {
    primaryCtaLabel?: string;
    primaryCtaLink?: MSLink;
    primaryCtaStyle?: CtaStyle;
    secondaryCtaLabel?: string;
    secondaryCtaLink?: MSLink;
    secondaryCtaStyle?: CtaStyle;
  };
}

function FaqSection({
  className,
  // Inline RichText is bound to fresh `…Rt` keys so it never reads a legacy
  // TextInput string and crashes the builder's introspection (see countdown-
  // banner.tsx for the same workaround). Aliased back to the local names.
  eyebrowRt: eyebrow,
  headingRt: heading,
  introRt: intro,
  layout,
  items,
  help,
  buttons,
}: FaqSectionProps) {
  const {
    variant = "stack",
    align = "left",
    toggleIcon = "plusminus",
    multiOpen = false,
    defaultOpenIndex = 0,
    showHelp = false,
  } = layout ?? {};

  const itemList = useMemo<FaqItem[]>(() => items ?? [], [items]);

  // `-1` (or anything < 0) means "all closed". Otherwise the index is the one
  // panel that opens on mount; with multiOpen we seed the set with that index.
  const initialOpen = defaultOpenIndex < 0
    ? (multiOpen ? ([] as number[]) : -1)
    : (multiOpen ? [defaultOpenIndex] : defaultOpenIndex);
  const [open, setOpen] = useState<number | number[]>(initialOpen);

  const isOpen = (i: number) =>
    multiOpen ? (open as number[]).includes(i) : (open as number) === i;

  const toggle = (i: number) => {
    if (multiOpen) {
      setOpen((prev) => {
        const arr = prev as number[];
        return arr.includes(i) ? arr.filter((x) => x !== i) : [...arr, i];
      });
    } else {
      setOpen((prev) => ((prev as number) === i ? -1 : i));
    }
  };

  const rows = (
    <div className="faq-list">
      {itemList.map((it, i) => {
        const opened = isOpen(i);
        const hasItemLink =
          !!(it.linkLabel && it.linkLabel.trim()) &&
          !!it.link?.href &&
          it.link.href !== "#";
        return (
          <div key={i} className={`faq-item${opened ? " open" : ""}`}>
            <button
              type="button"
              className="faq-q"
              onClick={() => toggle(i)}
              aria-expanded={opened}
            >
              <span className="faq-q-text">{it.question}</span>
              <span className={`faq-toggle${toggleIcon === "chev" ? " chev" : ""}`}>
                {toggleIcon === "chev" ? (
                  <Icon name="chev" size={15} />
                ) : (
                  <Icon name={opened ? "minus" : "plus"} size={15} />
                )}
              </span>
            </button>
            {/* Answer slot is always rendered — the grid-template-rows
                transition (0fr ↔ 1fr) controls visibility so the editor can
                still see and edit content while collapsed. */}
            <div className="faq-a">
              <div className="faq-a-clip">
                <div className="faq-a-inner">
                  {it.answer && <p>{it.answer}</p>}
                  {hasItemLink && (
                    <div className="faq-a-links">
                      <a {...linkProps(it.link)}>
                        {it.linkLabel}
                        <Icon name="arrow" size={13} />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const helpBlock = showHelp ? (
    <div className="faq-help">
      <span className="faq-help-lead">{help?.helpLead}</span>
      {help?.helpBody && <p className="faq-help-body">{help.helpBody}</p>}
      {(buttons?.primaryCtaLabel || buttons?.secondaryCtaLabel) && (
        <div className="faq-help-ctas">
          {buttons?.primaryCtaLabel && (
            <a
              {...linkProps(buttons.primaryCtaLink)}
              className={ctaClass(buttons.primaryCtaStyle, "primary", "btn-sm")}
            >
              <Icon name="headset" size={14} />
              {buttons.primaryCtaLabel}
            </a>
          )}
          {buttons?.secondaryCtaLabel && (
            <a
              {...linkProps(buttons.secondaryCtaLink)}
              className={ctaClass(buttons.secondaryCtaStyle, "secondary", "btn-sm")}
            >
              {buttons.secondaryCtaLabel}
            </a>
          )}
        </div>
      )}
    </div>
  ) : null;

  if (variant === "split") {
    return (
      <section className={`faq-section ${className ?? ""}`}>
        <style>{FAQ_CSS}</style>
        <div className="container">
          <div className="faq split">
            <aside className="faq-aside">
              {/* Inline RichText regions: EditableRegion keeps them clickable
                  while editing but collapses them when empty on live + interact. */}
              <EditableRegion as="span" className="faq-eyebrow">{eyebrow}</EditableRegion>
              <EditableRegion as="h2">{heading}</EditableRegion>
              <EditableRegion as="div" className="faq-aside-body">{intro}</EditableRegion>
              {helpBlock}
            </aside>
            <div>{rows}</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`faq-section ${className ?? ""}`}>
      <style>{FAQ_CSS}</style>
      <div className="container">
        <div className={`faq${variant === "boxed" ? " boxed" : ""}`}>
          <div className={`faq-head${align === "center" ? " center" : ""}`}>
            <EditableRegion as="span" className="faq-eyebrow">{eyebrow}</EditableRegion>
            <EditableRegion as="h2">{heading}</EditableRegion>
            <EditableRegion as="div" className="faq-head-body">{intro}</EditableRegion>
          </div>
          {rows}
          {helpBlock}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Embedded CSS. Mirrors styles.css §FAQ (desktop) + mobile.css §FAQ in a single
// media query. One intentional diff vs the source: `.faq-q { cursor: pointer }`
// — the original demo wasn't interactive; ours is.
// ─────────────────────────────────────────────────────────────────────────────

const FAQ_CSS = `
.faq-section { width: 100%; padding: 56px 0; color: var(--ink); background: var(--bg); }

.faq { width: 100%; }

/* split layout — sticky intro column + accordion column */
.faq.split {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 72px;
  align-items: start;
}
.faq-aside { position: sticky; top: 32px; }
.faq-aside .faq-eyebrow {
  font-family: var(--font-mono); font-size: 11px; font-weight: 400;
  letter-spacing: .08em; color: var(--muted); text-transform: uppercase;
  display: block; margin-bottom: 14px;
}
.faq-aside h2 {
  font-family: var(--font-display); font-size: 32px; font-weight: 600;
  letter-spacing: -.02em; line-height: 1.08; margin: 0; color: var(--ink);
  max-width: 14ch;
}
.faq-aside .faq-aside-body {
  color: var(--muted); font-size: 14px; line-height: 1.6;
  margin: 16px 0 0; max-width: 36ch;
}

/* help block — borderless top divider on desktop split; a bordered surface-2
   card on mobile (≤880px). */
.faq-help {
  margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--line);
  display: flex; flex-direction: column; gap: 12px; align-items: flex-start;
}
.faq-help-lead { font-size: 13px; color: var(--ink-2); font-weight: 500; }
.faq-help-lead:empty { display: none; }
.faq-help-body { margin: 0; font-size: 13px; color: var(--muted); line-height: 1.55; max-width: 32ch; }
.faq-help-ctas { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.faq-help-ctas a { display: inline-flex; align-items: center; gap: 6px; }

/* header for stack / boxed layouts */
.faq-head { margin-bottom: 28px; }
.faq-head.center { text-align: center; }
.faq-head .faq-eyebrow {
  font-family: var(--font-mono); font-size: 11px; font-weight: 400;
  letter-spacing: .08em; color: var(--muted); text-transform: uppercase;
  display: block; margin-bottom: 12px;
}
.faq-head h2 {
  font-family: var(--font-display); font-size: 32px; font-weight: 600;
  letter-spacing: -.02em; line-height: 1.1; margin: 0; color: var(--ink);
}
.faq-head.center h2 { margin-inline: auto; max-width: 18ch; }
.faq-head .faq-head-body {
  color: var(--muted); font-size: 14px; line-height: 1.6; margin: 14px 0 0;
  max-width: 56ch;
}
.faq-head.center .faq-head-body { margin-inline: auto; }

/* list + items */
.faq-list { border-top: 1px solid var(--line); }
.faq-item { border-bottom: 1px solid var(--line); }

.faq-q {
  width: 100%; display: flex; align-items: flex-start; justify-content: space-between;
  gap: 24px; padding: 22px 0; background: transparent; border: 0; cursor: pointer;
  font: inherit; text-align: left; color: var(--ink);
}
.faq-q .faq-q-text {
  font-family: var(--font-display); font-size: 17px; font-weight: 600;
  letter-spacing: -.01em; line-height: 1.4; color: var(--ink);
}
.faq-item.open .faq-q-text { color: var(--ink); }

.faq-toggle {
  flex-shrink: 0; width: 30px; height: 30px; margin-top: -2px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--line-2); border-radius: 50%;
  background: var(--surface); color: var(--ink-2);
  transition: transform .22s ease, background .15s, border-color .15s, color .15s;
}
.faq-q:hover .faq-toggle { border-color: var(--ink-2); }
.faq-item.open .faq-toggle { background: var(--ink); border-color: var(--ink); color: #fff; }
.faq-toggle.chev {
  transition: transform .22s ease, color .15s; border: 0; background: transparent;
  width: 22px; height: 22px; color: var(--muted);
}
.faq-item.open .faq-toggle.chev { transform: rotate(180deg); background: transparent; color: var(--ink); }

/* animated reveal via grid-rows — no layout measurement */
.faq-a {
  display: grid; grid-template-rows: 0fr;
  transition: grid-template-rows .26s ease;
}
.faq-item.open .faq-a { grid-template-rows: 1fr; }
.faq-a-clip { overflow: hidden; min-height: 0; }
.faq-a-inner {
  padding: 0 56px 24px 0;
  font-size: 14px; line-height: 1.65; color: var(--ink-2);
  max-width: 68ch;
}
.faq-a-inner p { margin: 0 0 12px; }
.faq-a-inner p:last-child { margin-bottom: 0; }

/* per-item inline link — globals.css has no .btn.link rule so we scope our own */
.faq-a-links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.faq-a-links a {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: inherit; font-size: 13px; font-weight: 500;
  color: var(--ink); text-decoration: none;
  padding: 4px 0;
  border-bottom: 1px solid transparent;
  transition: border-color .15s, color .15s;
}
.faq-a-links a:hover { border-bottom-color: var(--ink); }

/* boxed variant — each row is a bordered card */
.faq.boxed .faq-list { border-top: 0; display: flex; flex-direction: column; gap: 10px; }
.faq.boxed .faq-item {
  border: 1px solid var(--line); border-radius: var(--radius-card);
  background: var(--surface); overflow: hidden;
}
.faq.boxed .faq-item.open { border-color: var(--line-2); box-shadow: var(--shadow-sm); }
.faq.boxed .faq-q { padding: 18px 20px; }
.faq.boxed .faq-a-inner { padding: 0 20px 20px; }

/* responsive — design's 880px collapse + mobile typography */
@media (max-width: 880px) {
  .faq.split { grid-template-columns: 1fr; gap: 32px; }
  .faq-aside { position: static; }
  .faq-aside h2 { max-width: none; }

  .faq-help {
    margin-top: 20px; padding: 18px; border: 1px solid var(--line);
    border-radius: var(--radius-card); background: var(--surface-2);
    border-top: 1px solid var(--line);
  }

  .faq-q .faq-q-text { font-size: 15px; letter-spacing: -.005em; line-height: 1.35; }
  .faq-toggle { width: 28px; height: 28px; }
  .faq-a-inner { padding: 0 36px 18px 0; font-size: 13.5px; line-height: 1.6; }
  .faq.boxed .faq-q { padding: 14px 16px; }
  .faq.boxed .faq-a-inner { padding: 0 16px 16px; }
  .faq-section { padding: 40px 0; }
  .faq-head h2, .faq-aside h2 { font-size: 24px; }
}

@media (max-width: 480px) {
  .faq-section { padding: 32px 0; }
}
`;

runtime.registerComponent(FaqSection, {
  type: "acme/faq-section",
  label: "Content / FAQ Accordion",
  props: {
    className: Style(),

    // Top-level inline RichText. Fresh `…Rt` keys so the builder doesn't read
    // a legacy TextInput string and crash on introspection.
    eyebrowRt: RichText({ mode: RichText.Mode.Inline, defaultValue: "Help center" }),
    headingRt: RichText({ mode: RichText.Mode.Inline, defaultValue: "Questions, answered." }),
    introRt: RichText({
      mode: RichText.Mode.Inline,
      defaultValue:
        "Everything contractors ask about specs, terms, shipping, and support — in one place.",
    }),

    layout: Group({
      label: "Layout",
      preferredLayout: Group.Layout.Popover,
      props: {
        variant: Select({
          label: "Layout",
          options: [
            { label: "Stack (single column)", value: "stack" },
            { label: "Split (sticky intro + list)", value: "split" },
            { label: "Boxed (each item as a card)", value: "boxed" },
          ],
          defaultValue: "stack",
        }),
        align: Select({
          label: "Header alignment (stack / boxed only)",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
          ],
          defaultValue: "left",
        }),
        toggleIcon: Select({
          label: "Toggle icon",
          options: [
            { label: "Plus / Minus", value: "plusminus" },
            { label: "Chevron", value: "chev" },
          ],
          defaultValue: "plusminus",
        }),
        multiOpen: Checkbox({ label: "Allow multiple open at once", defaultValue: false }),
        defaultOpenIndex: MSNumber({
          label: "Default open item index (-1 = all closed, 0 = first)",
          defaultValue: 0,
          step: 1,
        }),
        showHelp: Checkbox({ label: "Show \"still have a question?\" block", defaultValue: false }),
      },
    }),

    items: List({
      label: "FAQ items",
      // List items can't use RichText — must be TextInput / TextArea inside a Shape.
      type: Shape({
        type: {
          question: TextInput({
            label: "Question",
            defaultValue: "Do you offer net terms?",
          }),
          answer: TextArea({
            label: "Answer",
            defaultValue:
              "Net-30 is available after a brief application — typically approved within one business day. Net-60 and Net-90 are available on accounts over $25k/quarter.",
          }),
          linkLabel: TextInput({ label: "Inline link label (optional)", defaultValue: "" }),
          link: Link({ label: "Inline link destination" }),
        },
      }),
      getItemLabel: (item) => {
        const i = item as FaqItem | undefined;
        return (i?.question?.trim() || "FAQ item");
      },
    }),

    help: Group({
      label: "Help block copy",
      preferredLayout: Group.Layout.Popover,
      props: {
        helpLead: TextInput({
          label: "Lead text",
          defaultValue: "Still have a question?",
        }),
        helpBody: TextArea({
          label: "Body copy",
          defaultValue:
            "Our application desk is live 7am–6pm PT, weekdays — typical reply under 2 minutes.",
        }),
      },
    }),

    buttons: Group({
      label: "Buttons",
      preferredLayout: Group.Layout.Popover,
      props: {
        // Inline the option list (rather than importing CTA_STYLE_OPTIONS)
        // — Select inside a Group narrows on the literal `defaultValue` and
        // refuses the widened `CtaStyle` from the shared constant.
        primaryCtaLabel: TextInput({ label: "Primary button label", defaultValue: "Start live chat" }),
        primaryCtaLink: Link({ label: "Primary button link" }),
        primaryCtaStyle: Select({
          label: "Primary button style",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Secondary", value: "secondary" },
            { label: "Inverted (light)", value: "inverted-light" },
            { label: "Inverted (dark)", value: "inverted-dark" },
          ],
          defaultValue: "primary",
        }),
        secondaryCtaLabel: TextInput({ label: "Secondary button label (optional)", defaultValue: "Email us" }),
        secondaryCtaLink: Link({ label: "Secondary button link" }),
        secondaryCtaStyle: Select({
          label: "Secondary button style",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Secondary", value: "secondary" },
            { label: "Inverted (light)", value: "inverted-light" },
            { label: "Inverted (dark)", value: "inverted-dark" },
          ],
          defaultValue: "secondary",
        }),
      },
    }),
  },
});

export default FaqSection;
