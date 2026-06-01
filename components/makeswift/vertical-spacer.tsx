"use client";

import { runtime } from "@/lib/makeswift/runtime";
import { Style, Number } from "@makeswift/runtime/controls";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VerticalSpacer(props: any) {
  const { desktopTop, desktopBottom, mobileTop, mobileBottom, className } = props as {
    desktopTop?: number;
    desktopBottom?: number;
    mobileTop?: number;
    mobileBottom?: number;
    className?: string;
  };

  return (
    <div
      className={`acme-vspacer ${className ?? ""}`}
      style={{
        "--vsp-dt": `${desktopTop ?? 40}px`,
        "--vsp-db": `${desktopBottom ?? 40}px`,
        "--vsp-mt": `${mobileTop ?? 20}px`,
        "--vsp-mb": `${mobileBottom ?? 20}px`,
      } as React.CSSProperties}
    />
  );
}

runtime.registerComponent(VerticalSpacer, {
  type: "acme-vertical-spacer",
  label: "Layout & Slots / Vertical Spacer",
  props: {
    className: Style(),
    desktopTop: Number({ label: "Desktop — top (px)", defaultValue: 40 }),
    desktopBottom: Number({ label: "Desktop — bottom (px)", defaultValue: 40 }),
    mobileTop: Number({ label: "Mobile — top (px)", defaultValue: 20 }),
    mobileBottom: Number({ label: "Mobile — bottom (px)", defaultValue: 20 }),
  },
});
