"use client";

import { useState } from "react";

interface ProductTabsProps {
  specs?: Record<string, string>;
  description?: string;
  reviewCount: number;
}

export function ProductTabs({ specs, description, reviewCount }: ProductTabsProps) {
  const tabs = [
    specs && Object.keys(specs).length > 0 ? "Specifications" : null,
    description ? "Description" : null,
    reviewCount > 0 ? "Reviews" : null,
  ].filter((t): t is string => t !== null);

  const [active, setActive] = useState(tabs[0] ?? "");

  if (!tabs.length) return null;

  return (
    <div>
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={tab === active ? "active" : ""}
            type="button"
            onClick={() => setActive(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {active === "Specifications" && specs && (
        <div className="card">
          {/* `tbl-mobile-cards` collapses the spec table to stacked rows on
              mobile (≤768px). Each row becomes: name on the left (col-primary),
              value on the right (col-value). Desktop layout — the two-column
              key/value table with the tinted key column — is unchanged. */}
          <table className="tbl tbl-mobile-cards">
            <tbody>
              {Object.entries(specs).map(([key, val]) => (
                <tr key={key}>
                  <td className="col-primary" style={{ width: "38%", fontWeight: 500, fontSize: 13, color: "var(--ink-2)", background: "var(--surface-2)" }}>{key}</td>
                  <td className="col-value" style={{ fontSize: 13 }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active === "Description" && description && (
        <div className="card card-b">
          <div
            style={{ fontSize: 13, lineHeight: 1.65, color: "var(--ink-2)" }}
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </div>
      )}

      {active === "Reviews" && reviewCount > 0 && (
        <div className="card card-b" style={{ color: "var(--muted)", fontSize: 13 }}>
          {reviewCount} review{reviewCount !== 1 ? "s" : ""} — view on product page.
        </div>
      )}
    </div>
  );
}
