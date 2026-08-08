"use client";

// "Account / Quick Links" — a configurable tile grid linking to the buyer's
// account areas. Static: no data fetch. Each tile is an icon + label + link,
// edited in the Makeswift side panel. Drop it into any of the account
// dashboard regions.

import Link from "next/link";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput, Select, List, Shape } from "@makeswift/runtime/controls";
import { Icon, type IconName } from "@/components/ui/icons";

interface Tile {
  icon?: IconName;
  label?: string;
  href?: string;
}

const DEFAULT_TILES: Tile[] = [
  { icon: "pkg", label: "Orders", href: "/account/orders" },
  { icon: "quote", label: "Quotes", href: "/account/quotes" },
  { icon: "receipt", label: "Invoices", href: "/account/invoices" },
  { icon: "list", label: "Lists", href: "/account/lists" },
];

const TILE_ICONS = [
  { label: "Orders / Package", value: "pkg" },
  { label: "Quote", value: "quote" },
  { label: "Invoice / Receipt", value: "receipt" },
  { label: "List", value: "list" },
  { label: "Dashboard", value: "dashboard" },
  { label: "User", value: "user" },
  { label: "People", value: "users" },
  { label: "Building", value: "building" },
  { label: "Address pin", value: "pin" },
  { label: "Credit card", value: "card" },
  { label: "Dollar", value: "dollar" },
  { label: "Truck", value: "truck" },
  { label: "Bolt", value: "bolt" },
  { label: "Document", value: "doc" },
  { label: "Settings", value: "settings" },
] as const satisfies readonly { label: string; value: IconName }[];

interface QuickLinksProps {
  className?: string;
  heading?: string;
  tiles?: Tile[];
}

function AccountQuickLinks({ className, heading, tiles }: QuickLinksProps) {
  const items = tiles && tiles.length > 0 ? tiles : DEFAULT_TILES;

  return (
    <div className={`card ${className ?? ""}`}>
      <div className="card-h">
        <h3>{heading || "Quick links"}</h3>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 10,
          padding: 16,
        }}
      >
        {items.map((t, i) => (
          <Link
            key={`${t.label ?? ""}-${i}`}
            href={t.href || "#"}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "18px 12px",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius)",
              textDecoration: "none",
              color: "var(--ink)",
              textAlign: "center",
            }}
          >
            <Icon name={t.icon ?? "arrow"} size={22} style={{ color: "var(--primary)" }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{t.label || "Link"}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

runtime.registerComponent(AccountQuickLinks, {
  type: "acme-account-quick-links",
  label: "Account / Quick Links — account shortcut tiles",
  props: {
    className: Style(),
    heading: TextInput({ label: "Heading", defaultValue: "Quick links" }),
    tiles: List({
      label: "Tiles",
      type: Shape({
        type: {
          icon: Select({ label: "Icon", options: TILE_ICONS, defaultValue: "pkg" }),
          label: TextInput({ label: "Label", defaultValue: "Orders" }),
          href: TextInput({ label: "Link (path)", defaultValue: "/account/orders" }),
        },
      }),
      getItemLabel: (item) => (item as Tile | undefined)?.label?.trim() || "Tile",
    }),
  },
});

export default AccountQuickLinks;
