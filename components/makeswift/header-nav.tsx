"use client";

import { runtime } from "@/lib/makeswift/runtime";
import {
  Style,
  TextInput,
  List,
  Shape,
  Link,
} from "@makeswift/runtime/controls";
import MegaNav, { type NavNode } from "@/components/mega-nav";
import type { MSLink } from "@/lib/makeswift/link";

// ─── Header navigation (Makeswift wrapper) ──────────────────────────────────
//
// Navigation hierarchy is driven by a Shopify Menu (Admin → Online Store →
// Navigation). Set `menuHandle` to the handle of the menu you want to use
// (default: "main-menu"). The menu defines all L1–L3 category structure; the
// Storefront API returns the nested tree which feeds the mega-nav panels.
//
//   • Content pages — right-aligned links to authored content/marketing pages.
//     Each may carry an optional list of sub-links, rendered as a two-level
//     dropdown. Content pages always stay visible — they never collapse into
//     the categories' "More" overflow.

interface ContentSubLink {
  label?: string;
  link?: MSLink;
}

interface ContentPageLink {
  label?: string;
  link?: MSLink;
  children?: ContentSubLink[];
}

interface Props {
  menuHandle?: string;
  contentLinks?: ContentPageLink[];
  freeFreightText?: string;
  className?: string;
}

function HeaderNav({
  menuHandle = "main-menu",
  contentLinks = [],
  freeFreightText,
  className,
}: Props) {
  const freightDisplay = freeFreightText || "Free freight over $500";

  // Map the admin-authored content pages into NavNodes. Tagged "content" so the
  // nav renders them right of the divider — always visible, never folded into
  // the categories' "More" overflow. A page with no sub-links renders as a
  // plain link; one with sub-links opens a two-level dropdown. Positional ids
  // are stable for a given config order.
  const contentPages: NavNode[] = contentLinks.map((link, i) => ({
    id: `content-${i}`,
    name: link.label || "Page",
    slug: "",
    url: link.link?.href || "#",
    target: link.link?.target,
    type: "content",
    children: (link.children ?? [])
      .filter((c) => c.label || c.link?.href)
      .map((c, j) => ({
        id: `content-${i}-${j}`,
        name: c.label || "Link",
        slug: "",
        url: c.link?.href || "#",
        target: c.link?.target,
      })),
  }));

  return (
    <MegaNav
      className={className}
      menuHandle={menuHandle}
      contentPages={contentPages}
      tail={<span>{freightDisplay}</span>}
    />
  );
}

// ─── Makeswift registration ────────────────────────────────────────────────

runtime.registerComponent(HeaderNav, {
  type: "acme/header-nav",
  label: "Navigation / Header Navigation",
  props: {
    className: Style(),
    menuHandle: TextInput({
      label: "Shopify menu handle",
      defaultValue: "main-menu",
    }),
    freeFreightText: TextInput({
      label: "Free freight text",
      defaultValue: "Free freight over $500",
    }),
    contentLinks: List({
      label: "Content pages (right side)",
      type: Shape({
        type: {
          label: TextInput({ label: "Link label", defaultValue: "Page" }),
          link: Link({ label: "Link" }),
          children: List({
            label: "Sub-links (optional)",
            type: Shape({
              type: {
                label: TextInput({ label: "Label", defaultValue: "Link" }),
                link: Link({ label: "Link" }),
              },
            }),
            getItemLabel: (item) => item?.label || "Sub-link",
          }),
        },
      }),
      getItemLabel: (item) => item?.label || "Content page",
    }),
  },
});
