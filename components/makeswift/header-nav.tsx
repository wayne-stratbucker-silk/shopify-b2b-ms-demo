"use client";

import { runtime } from "@/lib/makeswift/runtime";
import {
  Style,
  TextInput,
  List,
  Shape,
  Combobox,
  Link,
} from "@makeswift/runtime/controls";
import MegaNav, { type NavNode } from "@/components/mega-nav";
import type { MSLink } from "@/lib/makeswift/link";

// ─── Header navigation (Makeswift wrapper) ──────────────────────────────────
//
// The collection list comes LIVE from Shopify. There are two layers:
//
//   • "All Categories" launcher — always reflects the FULL live Shopify
//     collection list, with zero Makeswift input. Add/rename a collection in
//     Shopify and it appears here.
//   • Pinned collections — an optional curated subset the admin selects from
//     the existing Shopify collections (searchable dropdown). These render as
//     the bar items beside "All Categories". Leave empty to show every collection.
//   • Content pages — right-aligned links to authored content/marketing pages.
//     Each may carry an optional list of sub-links, rendered as a two-level
//     dropdown. Content pages always stay visible — they never collapse into
//     the collections' "More" overflow.

// Combobox value — a plain object so it satisfies Makeswift's JSON `Data`
// constraint. `id` is the BC category id; `name` is the path label kept so the
// builder can show a friendly item label.
type CategoryRef = { id: string; name: string };

interface PinnedCategory {
  category?: CategoryRef;
}

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
  pinnedCategories?: PinnedCategory[];
  contentLinks?: ContentPageLink[];
  freeFreightText?: string;
  className?: string;
}

function HeaderNav({
  pinnedCategories = [],
  contentLinks = [],
  freeFreightText,
  className,
}: Props) {
  const freightDisplay = freeFreightText || "Free freight over $500";

  const pinnedIds = pinnedCategories
    .map((p) => p.category?.id)
    .filter((id): id is string => !!id);

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
      pinnedIds={pinnedIds}
      contentPages={contentPages}
      tail={<span>{freightDisplay}</span>}
    />
  );
}

// ─── Makeswift registration ────────────────────────────────────────────────

// Flatten the live Shopify collections into searchable options for the builder.
// Runs client-side inside the Makeswift host iframe, so the relative fetch
// resolves against the storefront origin.
async function categoryOptions(query: string) {
  try {
    const res = await fetch("/api/shopify/collections");
    const tree = await res.json();
    const opts: { id: string; label: string; value: CategoryRef }[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const walk = (nodes: any[], prefix: string) => {
      for (const n of nodes ?? []) {
        const id = String(n.id);
        const label = prefix ? `${prefix} › ${n.name}` : n.name;
        opts.push({ id, label, value: { id, name: label } });
        if (n.children?.length) walk(n.children, label);
      }
    };
    walk(Array.isArray(tree) ? tree : [], "");
    const q = query.trim().toLowerCase();
    return q ? opts.filter((o) => o.label.toLowerCase().includes(q)) : opts;
  } catch {
    return [];
  }
}

runtime.registerComponent(HeaderNav, {
  type: "acme/header-nav",
  label: "Navigation / Header Navigation",
  props: {
    className: Style(),
    freeFreightText: TextInput({
      label: "Free freight text",
      defaultValue: "Free freight over $500",
    }),
    pinnedCategories: List({
      label: "Categories (nav bar)",
      type: Shape({
        type: {
          category: Combobox({
            label: "Category",
            getOptions: categoryOptions,
          }),
        },
      }),
      getItemLabel: (item) =>
        (item?.category as CategoryRef | undefined)?.name || "Select a category",
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
