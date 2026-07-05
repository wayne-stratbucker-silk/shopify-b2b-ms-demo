"use client";

// Lazy Makeswift registration for the Quick Order Strip.
//
// The ~940-line implementation lives in ./quick-order-strip-impl and is pulled
// in via `next/dynamic`, so it ships as its own client chunk that loads only
// when a page renders this component — instead of riding in the shared Makeswift
// client bundle (MakeswiftProvider registers every component) on every
// storefront route. Registration stays eager and lightweight (the controls
// schema below) so the builder still discovers it.
//
// `ssr` is left at its default (true): the strip is still server-rendered to
// HTML on first paint, so there is no flash or CLS regression — only the client
// hydration bundle is split out.

import dynamic from "next/dynamic";
import type { ReactElement } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput } from "@makeswift/runtime/controls";

type QuickOrderStripProps = {
  className?: string;
  heading?: string;
  subheading?: string;
  ctaLabel?: string;
};

// `next/dynamic` widens the return type to `ReactNode | Promise<ReactNode>`
// (React 19), which Makeswift's registerComponent won't accept — the original
// concrete function returned `JSX.Element`. Cast back (type-only; runtime value
// is unchanged).
const QuickOrderStrip = dynamic(() =>
  import("./quick-order-strip-impl").then((m) => m.QuickOrderStrip),
) as unknown as (props: QuickOrderStripProps) => ReactElement;

runtime.registerComponent(QuickOrderStrip, {
  type: "acme-quick-order-strip",
  label: "Products & Ordering / Quick Order Strip",
  props: {
    className: Style(),
    heading: TextInput({ label: "Heading", defaultValue: "Quick Order by SKU" }),
    subheading: TextInput({ label: "Subheading", defaultValue: "Enter SKUs and quantities, then add them all to your cart at once" }),
    ctaLabel: TextInput({ label: "Button label (leave blank for auto)" }),
  },
});

export default QuickOrderStrip;
