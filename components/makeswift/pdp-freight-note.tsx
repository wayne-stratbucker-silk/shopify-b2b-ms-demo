"use client";

import { runtime } from "@/lib/makeswift/runtime";
import { TextInput, Select } from "@makeswift/runtime/controls";
import { Icon, type IconName } from "@/components/ui/icons";
import { ICON_OPTIONS } from "@/components/makeswift/pdp-trust-badges";

interface PdpFreightNoteProps {
  icon?: IconName;
  text?: string;
}

// The single freight line inside the PDP Availability box. Renders the same
// inline-icon + muted 12px text as the markup it replaced, so it drops into
// place unchanged. `text` falls back to the previous hardcoded copy so the live
// site renders identically until a merchandiser edits it.
function PdpFreightNote({ icon = "truck", text }: PdpFreightNoteProps) {
  return (
    <div style={{ fontSize: 12, color: "var(--muted)" }}>
      <Icon name={icon} size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
      {text || "Free freight on orders $500+"}
    </div>
  );
}

runtime.registerComponent(PdpFreightNote, {
  type: "acme/pdp-freight-note",
  label: "Products & Ordering / PDP Freight Note",
  props: {
    icon: Select({
      label: "Icon",
      options: ICON_OPTIONS,
      defaultValue: "truck",
    }),
    text: TextInput({ label: "Text", defaultValue: "Free freight on orders $500+" }),
  },
});

export default PdpFreightNote;
