"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import {
  Style, TextInput, RichText, Select, Checkbox, Link,
} from "@makeswift/runtime/controls";
import { linkProps, type MSLink } from "@/lib/makeswift/link";
import { EditableRegion } from "@/lib/makeswift/editable";

// On-brand color presets. Each theme fully resolves the banner's palette so the
// JSX never reaches for raw color literals. Colors map to the brand tokens in
// app/globals.css (--primary / --primary-ink / --primary-fade / --warn / --warn-fade).
type CtaStyle = "primary" | "secondary";

// Map the merchandiser-selected CTA style to the site's real button classes
// (same convention as full-banner.tsx).
function ctaClass(style: CtaStyle | undefined, fallback: CtaStyle, ...modifiers: string[]): string {
  const base = (style ?? fallback) === "secondary" ? "btn btn-ghost" : "btn";
  return [base, ...modifiers].filter(Boolean).join(" ");
}

type CountdownTheme = {
  bg: string; // section background
  text: string; // headline + general text
  eyebrowColor: string; // eyebrow text + badge accent
  eyebrowBg: string; // eyebrow badge fill
  eyebrowBorder: string; // eyebrow badge border
  blockBg: string; // countdown block fill
  blockBorder?: string; // countdown block outline (light theme)
  blockNumber: string; // countdown digit color
  separator: string; // colon color
};

const THEMES: Record<string, CountdownTheme> = {
  // Dark blue background, light fonts. Countdown blocks are white with dark-blue
  // digits, and the eyebrow uses white text (a faint white badge) so it clears
  // WCAG AA contrast on the navy section — the old light-blue eyebrow did not.
  dark: {
    bg: "#1a2e4a",
    text: "#ffffff",
    eyebrowColor: "#ffffff",
    eyebrowBg: "#ffffff1a",
    eyebrowBorder: "#ffffff40",
    blockBg: "#ffffff",
    blockNumber: "#1a2e4a",
    separator: "#ffffff",
  },
  // White background, navy text, outlined countdown blocks.
  light: {
    bg: "#ffffff",
    text: "#0f2640",
    eyebrowColor: "#1a3a5c",
    eyebrowBg: "#eef2f7",
    eyebrowBorder: "#1a3a5c33",
    blockBg: "#ffffff",
    blockBorder: "1px solid #1a3a5c",
    blockNumber: "#1a3a5c",
    separator: "#1a3a5c",
  },
  // Cream background, brand-brown accents.
  warm: {
    bg: "#f7eed8",
    text: "#5a3a08",
    eyebrowColor: "#8a5a0e",
    eyebrowBg: "#ffffff",
    eyebrowBorder: "#8a5a0e44",
    blockBg: "#8a5a0e",
    blockNumber: "#f7eed8",
    separator: "#8a5a0e",
  },
};

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function calcTimeRemaining(targetDate: string): TimeRemaining {
  const target = new Date(targetDate).getTime();
  if (Number.isNaN(target)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: false };
  }
  const diff = target - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: false,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function CountdownBlock({
  value,
  label,
  blockBg,
  blockBorder,
  blockNumber,
  labelColor,
}: {
  value: number;
  label: string;
  blockBg: string;
  blockBorder?: string;
  blockNumber: string;
  labelColor: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: 64,
      }}
    >
      <div
        style={{
          background: blockBg,
          border: blockBorder,
          borderRadius: 8,
          width: 68,
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-geist-mono)",
            fontSize: 28,
            fontWeight: 700,
            color: blockNumber,
            lineHeight: 1,
            letterSpacing: "-.02em",
          }}
        >
          {pad(value)}
        </span>
      </div>
      <span
        style={{
          fontFamily: "var(--font-geist-mono)",
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: labelColor,
          opacity: 0.65,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function CountdownSeparator({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        fontFamily: "var(--font-geist-mono)",
        fontSize: 24,
        fontWeight: 700,
        color,
        opacity: 0.4,
        alignSelf: "flex-start",
        marginTop: 14,
        lineHeight: 1,
      }}
    >
      :
    </span>
  );
}

function CountdownBanner({
  className,
  // Renamed keys (…Rt) so the inline RichText controls don't inherit the stale
  // string data saved under the old TextInput keys (eyebrow/headline), which
  // crashes the builder's introspection. Aliased back to the local names.
  eyebrowRt: eyebrow,
  headlineRt: headline,
  ctaLabel,
  ctaLink,
  ctaStyle,
  targetDate,
  theme,
  hideWhenExpired,
}: {
  className?: string;
  eyebrowRt?: ReactNode;
  headlineRt?: ReactNode;
  ctaLabel?: string;
  ctaLink?: MSLink;
  ctaStyle?: CtaStyle;
  targetDate?: string;
  theme?: string;
  hideWhenExpired?: boolean;
}) {
  const t = THEMES[theme ?? "dark"] ?? THEMES.dark;
  const validTarget = targetDate && targetDate.trim().length > 0 && !Number.isNaN(new Date(targetDate).getTime());

  const [time, setTime] = useState<TimeRemaining | null>(null);

  useEffect(() => {
    if (!validTarget) {
      setTime(null);
      return;
    }
    // Set immediately so there's no flash of 00:00:00:00
    setTime(calcTimeRemaining(targetDate!));
    const id = setInterval(() => {
      setTime(calcTimeRemaining(targetDate!));
    }, 1000);
    return () => clearInterval(id);
  }, [targetDate, validTarget]);

  // If expired and hideWhenExpired, render nothing
  if (time?.expired && hideWhenExpired) {
    return null;
  }

  const showExpiredMessage = time?.expired && !hideWhenExpired;

  return (
    <section
      className={`countdown-banner ${className ?? ""}`}
      style={{
        background: t.bg,
        padding: "32px 0",
      }}
    >
      <div className="container">
        <div
          className="countdown-row"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 32,
          }}
        >
          {/* Promo text */}
          <div className="countdown-copy" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Inline RichText regions: EditableRegion keeps them clickable while
                editing but collapses them when empty on live + interact. */}
            <EditableRegion
              as="span"
              style={{
                display: "inline-block",
                fontFamily: "var(--font-geist-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: t.eyebrowColor,
                background: t.eyebrowBg,
                border: `1px solid ${t.eyebrowBorder}`,
                borderRadius: 4,
                padding: "2px 8px",
                alignSelf: "flex-start",
              }}
            >
              {eyebrow}
            </EditableRegion>
            <EditableRegion
              as="h2"
              style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "-.025em",
                lineHeight: 1.2,
                margin: 0,
                color: t.text,
              }}
            >
              {headline}
            </EditableRegion>
            {ctaLabel && (
              <a
                {...linkProps(ctaLink)}
                className={ctaClass(ctaStyle, "primary", "btn-lg")}
                style={{ alignSelf: "flex-start", marginTop: 4 }}
              >
                {ctaLabel}
              </a>
            )}
          </div>

          {/* Countdown timer */}
          {validTarget && !showExpiredMessage && time && (
            <div
              aria-label="Countdown timer"
              className="countdown-timer"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              <CountdownBlock value={time.days} label="Days" blockBg={t.blockBg} blockBorder={t.blockBorder} blockNumber={t.blockNumber} labelColor={t.text} />
              <CountdownSeparator color={t.separator} />
              <CountdownBlock value={time.hours} label="Hrs" blockBg={t.blockBg} blockBorder={t.blockBorder} blockNumber={t.blockNumber} labelColor={t.text} />
              <CountdownSeparator color={t.separator} />
              <CountdownBlock value={time.minutes} label="Min" blockBg={t.blockBg} blockBorder={t.blockBorder} blockNumber={t.blockNumber} labelColor={t.text} />
              <CountdownSeparator color={t.separator} />
              <CountdownBlock value={time.seconds} label="Sec" blockBg={t.blockBg} blockBorder={t.blockBorder} blockNumber={t.blockNumber} labelColor={t.text} />
            </div>
          )}

          {showExpiredMessage && (
            <div
              style={{
                fontFamily: "var(--font-geist-mono)",
                fontSize: 13,
                color: t.text,
                opacity: 0.6,
                letterSpacing: ".05em",
              }}
            >
              This event has ended.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

runtime.registerComponent(CountdownBanner, {
  type: "acme/countdown-banner",
  label: "Banners & Ads / Countdown Promo Banner",
  props: {
    className: Style(),

    // Content — inline RichText: click directly on the canvas and type, instead
    // of editing in the side panel. Fresh `…Rt` keys (not eyebrow/headline) so
    // they don't read the legacy TextInput strings still saved on existing
    // pages — feeding a plain string to a RichText control crashes the builder's
    // introspection.
    eyebrowRt: RichText({ mode: RichText.Mode.Inline, defaultValue: "Limited time offer" }),
    headlineRt: RichText({ mode: RichText.Mode.Inline, defaultValue: "Sale ends soon" }),
    ctaLabel: TextInput({ label: "CTA label", defaultValue: "Shop now" }),
    ctaLink: Link({ label: "CTA link" }),
    ctaStyle: Select({
      label: "Button style",
      options: [
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
      ],
      defaultValue: "primary",
    }),

    // Countdown target
    targetDate: TextInput({
      label: "End date & time (ISO format: YYYY-MM-DDTHH:mm:ss)",
      defaultValue: "",
    }),

    // Styling — a single on-brand theme drives the whole palette.
    theme: Select({
      label: "Theme",
      options: [
        { label: "Dark (blue)", value: "dark" },
        { label: "Light (white + outlines)", value: "light" },
        { label: "Warm (brown)", value: "warm" },
      ],
      defaultValue: "dark",
    }),

    // Behavior
    hideWhenExpired: Checkbox({ label: "Hide when countdown ends", defaultValue: true }),
  },
});
