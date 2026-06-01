"use client";

import type { ReactNode } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Slot } from "@makeswift/runtime/controls";

// Pure-passthrough wrapper for the globally-linked PDP content region that
// sits between the spec/description tabs and the related-products grid in
// components/pdp-page.tsx. Admins drop any registered Makeswift component(s)
// into the Slot; the wrapper renders no DOM of its own so it collapses to
// nothing when the Slot is empty and dropped components own their own
// spacing/width/background.
function PdpContentRegion({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

runtime.registerComponent(PdpContentRegion, {
  type: "acme/pdp-content-region",
  label: "Layout & Slots / PDP Content Region",
  props: {
    children: Slot(),
  },
});
