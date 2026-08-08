"use client";

import type { ReactNode } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Slot } from "@makeswift/runtime/controls";

// Host component for the three editable account-dashboard regions (top /
// middle / bottom — see app/account/page.tsx). Mirrors page-content-region.tsx:
// a pure passthrough Slot host that renders no DOM of its own, so dropped
// components own their own width, spacing and background and the region
// collapses to nothing when empty on the live site.
//
// Anchored via <MakeswiftComponent> in app/account/page.tsx (one snapshot per
// region), not dropped from the tray, so it stays registered but hidden from
// the insert tray.
function AccountDashboardRegion({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

runtime.registerComponent(AccountDashboardRegion, {
  type: "acme/account-dashboard-region",
  label: "Layout & Slots / Account Dashboard Region",
  hidden: true,
  props: {
    children: Slot(),
  },
});

export default AccountDashboardRegion;
