"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput, Image, Link as LinkControl } from "@makeswift/runtime/controls";
import { linkProps, type MSLink } from "@/lib/makeswift/link";

// Makeswift Image control can return a URL string or { url, dimensions } object.
function toUrl(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "url" in v) return (v as { url: string }).url;
  return undefined;
}

interface Props {
  imageUrl?: unknown;
  headline?: string;
  ctaLabel?: string;
  ctaLink?: MSLink;
  className?: string;
}

function NavAd({ imageUrl, headline, ctaLabel, ctaLink, className }: Props) {
  const imgSrc = toUrl(imageUrl);

  // Render nothing if completely unconfigured
  if (!imgSrc && !headline && !ctaLabel) return null;

  return (
    <aside
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "14px 16px",
        background: "var(--surface-2)",
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--line)",
        minWidth: 180,
        maxWidth: 240,
      }}
      aria-label="Featured promotion"
    >
      {imgSrc && (
        <div
          style={{
            borderRadius: "var(--radius)",
            overflow: "hidden",
            aspectRatio: "16/9",
            background: "var(--surface-3)",
          }}
        >
          <img
            src={imgSrc}
            alt={headline ?? ""}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        </div>
      )}
      {headline && (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--ink)",
            lineHeight: 1.3,
          }}
        >
          {headline}
        </p>
      )}
      {ctaLabel && ctaLink?.href && (
        <Link
          {...linkProps(ctaLink)}
          className="btn btn-ghost btn-sm"
          style={{ alignSelf: "flex-start", fontSize: 12 }}
        >
          {ctaLabel}
        </Link>
      )}
    </aside>
  );
}

runtime.registerComponent(NavAd, {
  type: "acme/nav-ad",
  label: "Banners & Ads / Navigation Ad",
  props: {
    className: Style(),
    imageUrl: Image({ label: "Ad image", format: Image.Format.URL }),
    headline: TextInput({ label: "Headline" }),
    ctaLabel: TextInput({ label: "CTA label" }),
    ctaLink: LinkControl({ label: "CTA link" }),
  },
});
