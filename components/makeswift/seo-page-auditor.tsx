"use client";

import { useEffect, useState } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, Checkbox } from "@makeswift/runtime/controls";
import { auditDocument, type SeoIssue } from "@/lib/seo-audit";

interface Props {
  className?: string;
  alwaysShow?: boolean;
}

/**
 * Builder-time SEO / alt-text governance. Renders a floating audit panel of
 * issues on the current page. Shown only when the builder toggles "Always show"
 * OR the URL carries ?seo-audit=1 — so it never leaks onto the live storefront.
 */
function SeoPageAuditor({ className, alwaysShow = false }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [issues, setIssues] = useState<SeoIssue[] | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const on = alwaysShow || new URLSearchParams(window.location.search).has("seo-audit");
    setEnabled(on);
    if (!on) return;
    // Audit after the page has settled.
    const t = setTimeout(() => setIssues(auditDocument(document)), 500);
    return () => clearTimeout(t);
  }, [alwaysShow]);

  if (!enabled) return <span className={className} style={{ display: "none" }} />;

  const errors = issues?.filter((i) => i.severity === "error").length ?? 0;
  const warns = issues?.filter((i) => i.severity === "warn").length ?? 0;

  return (
    <div className={className} style={{ position: "fixed", right: 16, bottom: 16, zIndex: 990, width: 320, maxWidth: "90vw", fontSize: 13 }}>
      <div className="card" style={{ boxShadow: "0 10px 32px rgba(0,0,0,.18)", overflow: "hidden" }}>
        <button type="button" onClick={() => setOpen((o) => !o)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 14px", background: "var(--ink, #111)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}>
          <span>SEO / a11y audit</span>
          <span style={{ display: "flex", gap: 6 }}>
            {errors > 0 && <span style={{ background: "#dc2626", borderRadius: 999, padding: "1px 7px", fontSize: 11 }}>{errors}</span>}
            {warns > 0 && <span style={{ background: "#d97706", borderRadius: 999, padding: "1px 7px", fontSize: 11 }}>{warns}</span>}
            {issues && errors === 0 && warns === 0 && <span style={{ color: "#4ade80" }}>✓</span>}
          </span>
        </button>
        {open && (
          <div style={{ padding: 12, maxHeight: 300, overflow: "auto" }}>
            {!issues ? (
              <div className="muted">Auditing…</div>
            ) : issues.length === 0 ? (
              <div style={{ color: "var(--success, #16a34a)" }}>No issues found on this page.</div>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {issues.map((i, idx) => (
                  <li key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, marginTop: 5, flexShrink: 0, background: i.severity === "error" ? "#dc2626" : "#d97706" }} />
                    <span>{i.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

runtime.registerComponent(SeoPageAuditor, {
  type: "acme-seo-auditor",
  label: "Governance / SEO Auditor",
  props: {
    className: Style(),
    alwaysShow: Checkbox({ label: "Always show in preview", defaultValue: false }),
  },
});

export default SeoPageAuditor;
