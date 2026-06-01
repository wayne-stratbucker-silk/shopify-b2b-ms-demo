"use client";

import { runtime } from "@/lib/makeswift/runtime";
import { TextInput, Checkbox, Select, List, Shape, Group, Link } from "@makeswift/runtime/controls";
import { Icon, type IconName } from "@/components/ui/icons";
import { ctaClass, type CtaStyle } from "@/lib/makeswift/cta-class";
import { linkProps, type MSLink } from "@/lib/makeswift/link";

// ─── Default content (mirrors the hardcoded design) ───
// The buttons List starts empty in the builder, so we fall back to these three
// designed CTAs until a merchandiser adds their own — keeps the page faithful
// out of the box.
const DEFAULT_ACTIONS: NfAction[] = [
  { label: "Back to storefront",       icon: "arrow",   style: "primary",   link: { href: "/" } },
  { label: "Contact customer service", icon: "headset", style: "secondary", link: { href: "#" } },
  { label: "Email support",            icon: "doc",     style: "secondary", link: { href: "mailto:support@acmecorp.com" } },
];

// Icons a merchandiser is likely to want on a 404 action button.
const ACTION_ICONS = [
  { label: "None",    value: "" },
  { label: "Arrow",   value: "arrow" },
  { label: "Headset", value: "headset" },
  { label: "Doc",     value: "doc" },
  { label: "Mail",    value: "mail" },
  { label: "Phone",   value: "phone" },
  { label: "Search",  value: "search" },
  { label: "Home",    value: "building" },
] as const;

interface NfAction {
  label?: string;
  icon?: IconName | "";
  style?: CtaStyle;
  link?: MSLink;
}

interface NotFoundPageProps {
  eyebrow?: string;
  title?: string;
  lead?: string;
  buttons?: { actions?: NfAction[] };
  // Named `refLine` rather than `ref` — `ref` is reserved by React, so a prop
  // called `ref` makes the component type unassignable in registerComponent.
  refLine?: {
    showRef?: boolean;
    refLabel?: string;
    refCode?: string;
  };
}

function NotFoundPage({ eyebrow, title, lead, buttons, refLine }: NotFoundPageProps) {
  const actions = buttons?.actions && buttons.actions.length > 0 ? buttons.actions : DEFAULT_ACTIONS;
  const showRef = refLine?.showRef ?? true;
  const refLabel = refLine?.refLabel || "Requested";
  const refCode = refLine?.refCode || "/p/LH-9999-DISCONTINUED";

  return (
    <div className="nf">
      <section className="nf-hero">
        <div className="container nf-hero-grid">
          {/* ── Editable copy column ── */}
          <div className="nf-content">
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h1 className="nf-title">{title}</h1>}
            {lead && <p className="nf-lead">{lead}</p>}

            <div className="nf-actions">
              {actions.map((a, i) => (
                <a
                  key={`${a.label ?? ""}-${i}`}
                  className={ctaClass(a.style, "secondary")}
                  {...linkProps(a.link)}
                >
                  {a.icon ? <Icon name={a.icon} size={16} /> : null}
                  {a.label}
                </a>
              ))}
            </div>

            {showRef && (
              <div className="nf-ref mono">
                <span>{refLabel}</span>
                <code>{refCode}</code>
              </div>
            )}
          </div>

          {/* ── Hardcoded "powered-down panel" 404 visual ── */}
          <div className="nf-visual" aria-hidden="true">
            <div className="nf-panel">
              <div className="nf-panel-head mono">
                <span className="nf-led" />
                CIRCUIT · NO ROUTE
              </div>
              <div className="nf-code">404</div>
              <div className="nf-panel-foot mono">
                PAGE NOT FOUND
                <span>CHECK URL OR SKU</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

runtime.registerComponent(NotFoundPage, {
  type: "acme/not-found-page",
  label: "Layout & Slots / 404 Page",
  props: {
    eyebrow: TextInput({ label: "Eyebrow", defaultValue: "Error · HTTP 404" }),
    title: TextInput({ label: "Title", defaultValue: "This page isn't on the line." }),
    lead: TextInput({
      label: "Lead paragraph",
      defaultValue:
        "The page you're after may have moved, or the SKU was discontinued and superseded by a current part. Use the search up top, or head back to a known starting point.",
    }),
    buttons: Group({
      label: "Buttons",
      preferredLayout: Group.Layout.Popover,
      props: {
        actions: List({
          label: "Action buttons",
          type: Shape({
            type: {
              label: TextInput({ label: "Label", defaultValue: "Button" }),
              link: Link({ label: "Link" }),
              icon: Select({ label: "Icon", options: ACTION_ICONS, defaultValue: "arrow" }),
              // Inline the option list (rather than importing CTA_STYLE_OPTIONS)
              // — a Select inside a Group narrows on the literal `defaultValue`
              // and refuses the widened `CtaStyle` from the shared constant.
              style: Select({
                label: "Style",
                options: [
                  { label: "Primary", value: "primary" },
                  { label: "Secondary", value: "secondary" },
                  { label: "Inverted (light)", value: "inverted-light" },
                  { label: "Inverted (dark)", value: "inverted-dark" },
                ],
                defaultValue: "secondary",
              }),
            },
          }),
          getItemLabel: (item) => (item as NfAction | undefined)?.label?.trim() || "Button",
        }),
      },
    }),
    refLine: Group({
      label: "Reference line",
      preferredLayout: Group.Layout.Popover,
      props: {
        showRef: Checkbox({ label: "Show reference line", defaultValue: true }),
        refLabel: TextInput({ label: "Reference label", defaultValue: "Requested" }),
        refCode: TextInput({ label: "Reference value", defaultValue: "/p/LH-9999-DISCONTINUED" }),
      },
    }),
  },
});
