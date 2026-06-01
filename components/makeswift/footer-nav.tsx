"use client";

import { useState } from "react";
import Link from "next/link";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput, TextArea, List, Shape, Link as LinkControl } from "@makeswift/runtime/controls";
import { FooterNewsletter, FooterContact } from "../footer-client";
import { linkProps, type MSLink } from "@/lib/makeswift/link";

interface FooterLink   { label?: string; link?: MSLink }
interface FooterColumn { heading?: string; links?: FooterLink[] }
interface LegalLink    { label?: string; link?: MSLink }

interface Props {
  marketingHeading?: string;
  marketingText?: string;
  brandCopy?: string;
  columns?: FooterColumn[];
  legalLinks?: LegalLink[];
  className?: string;
}

// Real default copy — matches what the footer rendered before this became a
// Makeswift component, so existing pages look identical until an admin edits.
const DEFAULT_MARKETING_HEADING = "Trade pricing & restock alerts, weekly.";
const DEFAULT_MARKETING_TEXT =
  "Spec sheets, closeout drops, and account-tier promos — delivered to your purchasing inbox. No retail noise.";
const DEFAULT_BRAND_COPY =
  "The contractor's wholesale partner for commercial electrical & lighting. Distribution from 14 stocking locations nationwide.";

// List controls have no list-level default, so seed the legal links with the
// real copy when the admin hasn't added any yet — keeps the bottom bar intact.
const DEFAULT_LEGAL_LINKS: LegalLink[] = [
  { label: "Terms", link: { href: "#" } },
  { label: "Privacy", link: { href: "#" } },
  { label: "Accessibility", link: { href: "#" } },
  { label: "Cookie settings", link: { href: "#" } },
];

// Single nav column. On desktop the toggle button styles itself like the static
// heading and the link list is always visible (see .footer-col-toggle in
// globals.css). At ≤768px the button becomes a full-width accordion row with a
// chevron and the list collapses until expanded — one column open at a time is
// fine, so each column owns its own state.
function FooterNavColumn({ column }: { column: FooterColumn }) {
  const [open, setOpen] = useState(false);
  const headingId = `footer-col-${column.heading?.replace(/\s+/g, "-").toLowerCase() || "col"}`;
  return (
    <div className={`footer-col${open ? " is-open" : ""}`}>
      <h3>
        <button
          type="button"
          className="footer-col-toggle"
          aria-expanded={open}
          aria-controls={`${headingId}-list`}
          onClick={() => setOpen((o) => !o)}
        >
          <span>{column.heading || "Column"}</span>
          <span className="footer-col-chevron" aria-hidden="true" />
        </button>
      </h3>
      <ul id={`${headingId}-list`}>
        {(column.links ?? []).map((entry, j) => (
          <li key={j}>
            <Link {...linkProps(entry.link)}>{entry.label || "Link"}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Comprehensive, Makeswift-editable footer. Editable text/links live in the
// builder; the logo, copyright, dynamic contact, and subscribe FORM behaviour
// stay non-editable (the form + contact come from footer-client.tsx).
function FooterNav({
  marketingHeading = DEFAULT_MARKETING_HEADING,
  marketingText = DEFAULT_MARKETING_TEXT,
  brandCopy = DEFAULT_BRAND_COPY,
  columns = [],
  legalLinks,
  className,
}: Props) {
  const resolvedLegalLinks =
    legalLinks && legalLinks.length > 0 ? legalLinks : DEFAULT_LEGAL_LINKS;
  return (
    <footer className={`site-footer${className ? ` ${className}` : ""}`}>
      <div className="container">
        {/* Email signup — editable marketing text + functional subscribe form */}
        <div className="footer-signup">
          <div>
            <h2
              style={{
                fontFamily: "var(--font-geist-sans)",
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: "var(--ink)",
                margin: "0 0 6px",
              }}
            >
              {marketingHeading}
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", maxWidth: 460, lineHeight: 1.5 }}>
              {marketingText}
            </p>
          </div>
          <FooterNewsletter />
        </div>

        {/* Footer top — static logo + editable brand copy + dynamic contact + editable columns */}
        <div className="footer-top">
          <div>
            <Link href="/" className="brand" style={{ textDecoration: "none", color: "var(--ink)" }}>
              <span className="brand-mark">A</span>
              ACME
            </Link>
            <p style={{ margin: "14px 0 16px", color: "var(--muted)", maxWidth: 320 }}>
              {brandCopy}
            </p>
            <FooterContact />
          </div>

          {/* Editable nav link columns — collapse into accordions on mobile */}
          <div className="footer-nav-cols">
            {columns.map((col, i) => (
              <FooterNavColumn key={i} column={col} />
            ))}
          </div>
        </div>

        {/* Bottom bar — static copyright + editable legal links */}
        <div className="footer-bottom">
          <div>© 2026 ACME Industrial Supply Co. · All wholesale pricing subject to customer agreement.</div>
          <div className="legal-links">
            {resolvedLegalLinks.map((entry, i) => (
              <Link key={i} {...linkProps(entry.link)}>{entry.label || "Link"}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

runtime.registerComponent(FooterNav, {
  type: "acme/footer-nav",
  label: "Navigation / Footer",
  props: {
    className: Style(),
    marketingHeading: TextInput({
      label: "Marketing heading",
      defaultValue: DEFAULT_MARKETING_HEADING,
    }),
    marketingText: TextArea({
      label: "Marketing text",
      defaultValue: DEFAULT_MARKETING_TEXT,
    }),
    brandCopy: TextArea({
      label: "Brand copy",
      defaultValue: DEFAULT_BRAND_COPY,
    }),
    columns: List({
      label: "Columns",
      type: Shape({
        type: {
          heading: TextInput({ label: "Column heading", defaultValue: "Column" }),
          links: List({
            label: "Links",
            type: Shape({
              type: {
                label: TextInput({ label: "Link label", defaultValue: "Link" }),
                link:  LinkControl({ label: "Link" }),
              },
            }),
          }),
        },
      }),
    }),
    legalLinks: List({
      label: "Legal links",
      type: Shape({
        type: {
          label: TextInput({ label: "Label", defaultValue: "Terms" }),
          link:  LinkControl({ label: "Link" }),
        },
      }),
    }),
  },
});
