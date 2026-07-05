"use client";

// Lazy Makeswift registration for the Shoppable Diagram.
//
// The ~1400-line implementation lives in ./shoppable-diagram-impl and is pulled
// in via `next/dynamic`, so it ships as its own client chunk that loads only
// when a page renders this component — instead of riding in the shared Makeswift
// client bundle (MakeswiftProvider registers every component) on every
// storefront route. Registration stays eager and lightweight (the controls
// schema below). `ssr` defaults to true, so the component is still
// server-rendered — no flash or CLS regression.

import dynamic from "next/dynamic";
import type { ReactElement } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import {
  Style,
  TextInput,
  TextArea,
  List,
  Shape,
  Image,
  Number as NumberCtrl,
} from "@makeswift/runtime/controls";

type ShoppableDiagramProps = {
  className?: string;
  eyebrow?: string;
  heading?: string;
  copy?: string;
  addAllLabel?: string;
  jobs?: unknown[];
};

// `next/dynamic` widens the return type to `ReactNode | Promise<ReactNode>`
// (React 19), which Makeswift's registerComponent won't accept — the original
// concrete function returned `JSX.Element`. Cast back (type-only).
const ShoppableDiagram = dynamic(() =>
  import("./shoppable-diagram-impl").then((m) => m.ShoppableDiagram),
) as unknown as (props: ShoppableDiagramProps) => ReactElement;

// The per-hotspot product UI is a text-input for the product SKU, mirroring
// `shop-by-job` and `product-carousel`; SKUs are resolved at runtime. Building a
// fully custom searchable picker control is out of scope — admins type SKUs by
// hand for now.
runtime.registerComponent(ShoppableDiagram, {
  type: "acme-shoppable-diagram",
  label: "Products & Ordering / Shoppable Diagram",
  props: {
    className: Style(),
    eyebrow: TextInput({
      label: "Section eyebrow (above scene, optional)",
      defaultValue: "",
    }),
    heading: TextInput({
      label: "Section heading (above scene, optional)",
      defaultValue: "",
    }),
    copy: TextArea({
      label: "Section copy (above scene, optional)",
      defaultValue: "",
    }),
    addAllLabel: TextInput({
      label: "Add-all button label (leave blank for auto)",
    }),
    jobs: List({
      label: "Scenes",
      type: Shape({
        type: {
          jobId: TextInput({
            label: "Job code (e.g. WAREHOUSE-001) — shown in the stage label",
            defaultValue: "",
          }),
          eyebrow: TextInput({ label: "Eyebrow (unused on the scene UI)", defaultValue: "" }),
          title: TextInput({ label: "Scene title", defaultValue: "New scene" }),
          copy: TextArea({ label: "Scene copy (shown in the BOM rail header)" }),
          mainImage: Image({ label: "Stage image", format: Image.Format.URL }),
          hotspots: List({
            label: "Hotspots",
            type: Shape({
              type: {
                x: NumberCtrl({
                  label: "X position (%)",
                  defaultValue: 50,
                  min: 0,
                  max: 100,
                  step: 0.1,
                }),
                y: NumberCtrl({
                  label: "Y position (%)",
                  defaultValue: 50,
                  min: 0,
                  max: 100,
                  step: 0.1,
                }),
                sku: TextInput({ label: "Product SKU" }),
                defaultQuantity: NumberCtrl({
                  label: "Default quantity",
                  defaultValue: 1,
                  min: 1,
                  step: 1,
                }),
              },
            }),
            getItemLabel: (item) => {
              const h = item as { x?: number; y?: number; sku?: string };
              const pos = `(${(h?.x ?? 0).toFixed(0)}, ${(h?.y ?? 0).toFixed(0)})`;
              return h?.sku ? `${h.sku} ${pos}` : `Hotspot ${pos}`;
            },
          }),
        },
      }),
      getItemLabel: (item) => {
        const j = item as { title?: string };
        return j?.title?.trim() || "Scene";
      },
    }),
  },
});

export default ShoppableDiagram;
