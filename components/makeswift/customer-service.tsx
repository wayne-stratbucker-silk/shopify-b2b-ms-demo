"use client";

import { useEffect, useState, type ReactNode } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import {
  Style,
  TextInput,
  RichText,
  Checkbox,
  Group,
  Select,
} from "@makeswift/runtime/controls";
import { Icon } from "@/components/ui/icons";

// Mirrors the existing site CS pattern (components/pdp-contact-card.tsx,
// components/footer-client.tsx → FooterContact, components/header.tsx
// "Need help?" line, components/mobile-nav.tsx "Talk to us"):
//   - "Need help?" heading + short body
//   - Phone (tel:) CTA with headset icon
//   - Email (mailto:) CTA with mail icon (footer uses geist-mono for the number)
//   - Optional hours line in muted text

interface CustomerServiceProps {
  className?: string;
  // Inline RichText (top-level)
  heading?: ReactNode;
  body?: ReactNode;

  phone?: {
    show?: boolean;
    label?: string;
    number?: string;
  };
  email?: {
    show?: boolean;
    label?: string;
    address?: string;
  };
  hours?: string;
  // Visual options
  layout?: {
    background?: "surface" | "bg-alt" | "primary-fade";
    alignment?: "left" | "center";
  };
}

function stripTel(s: string): string {
  return s.replace(/[^0-9+]/g, "");
}

function CustomerService({
  className,
  heading,
  body,
  phone,
  email,
  hours,
  layout,
}: CustomerServiceProps) {
  const { show: showPhone = true, label: phoneLabel = "Call us", number: phoneNumber = "" } = phone ?? {};
  const { show: showEmail = true, label: emailLabel = "Email us", address: emailAddress = "" } = email ?? {};
  const { background = "surface", alignment = "left" } = layout ?? {};

  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const hasPhone = showPhone && phoneNumber.trim().length > 0;
  const hasEmail = showEmail && emailAddress.trim().length > 0;

  return (
    <section className={`cs-section cs-bg-${background} cs-align-${alignment} ${className ?? ""}`}>
      <style>{CS_CSS}</style>
      <div className="container">
        <div className={`cs-card${mobile ? " is-mobile" : ""}`}>
          <div className="cs-copy">
            {/* Always-rendered editable regions (inline RichText) */}
            <h2 className="cs-heading">{heading}</h2>
            <div className="cs-body">{body}</div>
            {hours && <div className="cs-hours">{hours}</div>}
          </div>
          <div className="cs-ctas">
            {hasPhone && (
              <a
                href={`tel:${stripTel(phoneNumber)}`}
                className="btn btn-ghost btn-block cs-cta"
              >
                <span className="cs-cta-icon">
                  <Icon name="headset" size={16} />
                </span>
                <span className="cs-cta-body">
                  <span className="cs-cta-label">{phoneLabel}</span>
                  <span className="cs-cta-detail">{phoneNumber}</span>
                </span>
              </a>
            )}
            {hasEmail && (
              <a
                href={`mailto:${emailAddress.trim()}`}
                className="btn btn-ghost btn-block cs-cta"
              >
                <span className="cs-cta-icon">
                  <Icon name="mail" size={16} />
                </span>
                <span className="cs-cta-body">
                  <span className="cs-cta-label">{emailLabel}</span>
                  <span className="cs-cta-detail">{emailAddress}</span>
                </span>
              </a>
            )}
            {!hasPhone && !hasEmail && (
              <div className="cs-empty">Add a phone or email in the Makeswift editor.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const CS_CSS = `
.cs-section { width: 100%; padding: 56px 0; color: var(--ink); }
.cs-bg-surface { background: var(--surface); }
.cs-bg-bg-alt { background: var(--bg-alt); }
.cs-bg-primary-fade { background: var(--primary-fade); }

.cs-card {
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-card);
  padding: 36px 40px; display: grid; grid-template-columns: 1.2fr 1fr;
  gap: 40px; align-items: center; box-shadow: var(--shadow-sm);
}
.cs-bg-bg-alt .cs-card,
.cs-bg-primary-fade .cs-card { border-color: var(--line); }

.cs-copy { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.cs-align-center .cs-copy { text-align: center; align-items: center; }
.cs-heading {
  font-family: var(--font-display); font-size: 28px; font-weight: 600;
  letter-spacing: -.02em; line-height: 1.15; margin: 0; color: var(--ink);
}
.cs-heading:empty { display: none; }
.cs-body { font-size: 14px; line-height: 1.55; color: var(--muted); max-width: 520px; }
.cs-body:empty { display: none; }
.cs-hours {
  font-family: var(--font-mono); font-size: 12px; color: var(--muted-2);
  letter-spacing: .03em; margin-top: 4px;
}

.cs-ctas { display: flex; flex-direction: column; gap: 12px; }

.cs-cta {
  display: grid !important;
  grid-template-columns: auto 1fr;
  gap: 14px;
  align-items: center;
  text-align: left;
  padding: 14px 18px !important;
  height: auto !important;
  text-decoration: none;
}
.cs-cta-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: var(--radius);
  background: var(--bg-alt); color: var(--primary); flex-shrink: 0;
}
.cs-cta:hover .cs-cta-icon { background: var(--primary); color: #fff; }
.cs-cta-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cs-cta-label { font-size: 12px; font-weight: 600; color: var(--muted); letter-spacing: .04em; text-transform: uppercase; }
.cs-cta-detail {
  font-family: var(--font-mono); font-size: 14px; color: var(--ink); font-weight: 500;
  letter-spacing: -.005em; overflow-wrap: anywhere;
}

.cs-empty {
  padding: 18px; text-align: center; color: var(--muted); font-size: 13px;
  background: var(--bg-alt); border-radius: var(--radius); border: 1px dashed var(--line-2);
}

@media (max-width: 767px) {
  .cs-section { padding: 40px 0; }
  .cs-card, .cs-card.is-mobile {
    grid-template-columns: 1fr; padding: 28px 24px; gap: 24px;
  }
  .cs-heading { font-size: 22px; }
}
@media (max-width: 480px) {
  .cs-section { padding: 32px 0; }
  .cs-card { padding: 24px 20px; }
  .cs-cta { padding: 12px 14px !important; }
  .cs-cta-detail { font-size: 13px; }
}
`;

runtime.registerComponent(CustomerService, {
  type: "acme-customer-service",
  label: "Trust & Brand / Customer Service",
  props: {
    className: Style(),

    // Inline RichText (top-level)
    heading: RichText({ mode: RichText.Mode.Inline, defaultValue: "Need help?" }),
    body: RichText({
      mode: RichText.Mode.Inline,
      defaultValue:
        "Talk to a B2B specialist about specs, availability, pricing, or freight quotes. Our team responds within one business hour.",
    }),

    phone: Group({
      label: "Phone",
      preferredLayout: Group.Layout.Popover,
      props: {
        show: Checkbox({ label: "Show phone CTA", defaultValue: true }),
        label: TextInput({ label: "Phone CTA label", defaultValue: "Call us" }),
        number: TextInput({
          label: "Phone number (formatted for display, tel: link strips formatting)",
          defaultValue: "(800) 555-0182",
        }),
      },
    }),

    email: Group({
      label: "Email",
      preferredLayout: Group.Layout.Popover,
      props: {
        show: Checkbox({ label: "Show email CTA", defaultValue: true }),
        label: TextInput({ label: "Email CTA label", defaultValue: "Email us" }),
        address: TextInput({
          label: "Email address",
          defaultValue: "support@acmecorp.com",
        }),
      },
    }),

    hours: TextInput({
      label: "Hours (shown in muted text — leave blank to hide)",
      defaultValue: "M–F · 6a–7p PT",
    }),

    layout: Group({
      label: "Layout",
      preferredLayout: Group.Layout.Popover,
      props: {
        background: Select({
          label: "Section background",
          options: [
            { label: "Surface (white)", value: "surface" },
            { label: "Light cream", value: "bg-alt" },
            { label: "Primary tint", value: "primary-fade" },
          ],
          defaultValue: "surface",
        }),
        alignment: Select({
          label: "Copy alignment",
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
          ],
          defaultValue: "left",
        }),
      },
    }),
  },
});

export default CustomerService;
