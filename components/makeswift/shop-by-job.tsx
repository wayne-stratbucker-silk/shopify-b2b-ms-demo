"use client";

// Lazy Makeswift registration for Shop by Job Type.
//
// The ~600-line implementation lives in ./shop-by-job-impl and is pulled in via
// `next/dynamic`, so it ships as its own client chunk that loads only when a
// page renders this component — instead of riding in the shared Makeswift client
// bundle (MakeswiftProvider registers every component) on every storefront
// route. Registration stays eager and lightweight (the controls schema below).
// `ssr` defaults to true, so the component is still server-rendered — no flash
// or CLS regression.

import dynamic from "next/dynamic";
import type { ReactElement } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput, List, Shape, Number as NumberCtrl } from "@makeswift/runtime/controls";

type ShopByJobProps = {
  className?: string;
  eyebrow?: string;
  heading?: string;
  copy?: string;
  jobs?: unknown[];
};

// `next/dynamic` widens the return type to `ReactNode | Promise<ReactNode>`
// (React 19), which Makeswift's registerComponent won't accept — the original
// concrete function returned `JSX.Element`. Cast back (type-only).
const ShopByJob = dynamic(() =>
  import("./shop-by-job-impl").then((m) => m.ShopByJob),
) as unknown as (props: ShopByJobProps) => ReactElement;

runtime.registerComponent(ShopByJob, {
  type: "acme-shop-by-job",
  label: "Products & Ordering / Shop by Job Type",
  props: {
    className: Style(),
    eyebrow: TextInput({ label: "Eyebrow", defaultValue: "Build your material list" }),
    heading: TextInput({ label: "Heading", defaultValue: "Shop by Job Type" }),
    copy: TextInput({ label: "Subtext", defaultValue: "Select a job type to add the full material list to your cart instantly." }),
    jobs: List({
      label: "Jobs",
      type: Shape({
        type: {
          jobName: TextInput({ label: "Job name", defaultValue: "New job" }),
          items: List({
            label: "BOM items",
            type: Shape({
              type: {
                sku: TextInput({ label: "Product SKU" }),
                quantity: NumberCtrl({ label: "Quantity", defaultValue: 1 }),
              },
            }),
            getItemLabel: (item) => {
              const i = item as { sku?: string; quantity?: number };
              return i?.sku ? `${i.sku} × ${i.quantity ?? 1}` : "Item";
            },
          }),
        },
      }),
      getItemLabel: (item) => (item as { jobName?: string })?.jobName ?? "Job",
    }),
  },
});

export default ShopByJob;
