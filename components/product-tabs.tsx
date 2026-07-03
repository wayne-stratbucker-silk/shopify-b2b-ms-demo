"use client";

import { useState } from "react";
import { StarRating } from "@/components/ui/star-rating";
import type { ProductReview } from "@/lib/reviews";

interface ProductTabsProps {
  specs?: Record<string, string>;
  description?: string;
  reviewCount: number;
  rating?: number;
  reviews?: ProductReview[];
}

function fmtDate(s?: string): string {
  if (!s) return "";
  try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return ""; }
}

export function ProductTabs({ specs, description, reviewCount, rating = 0, reviews = [] }: ProductTabsProps) {
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
        <div className="card card-b">
          {/* Aggregate */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 16, borderBottom: reviews.length ? "1px solid var(--line)" : undefined, marginBottom: reviews.length ? 16 : 0 }}>
            <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{rating.toFixed(1)}</div>
            <div>
              <StarRating rating={rating} size={16} />
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{reviewCount} review{reviewCount !== 1 ? "s" : ""}</div>
            </div>
          </div>
          {/* Individual reviews */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {reviews.map((r, i) => (
              <div key={i}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <StarRating rating={r.rating} />
                    {r.title && <span style={{ fontWeight: 600, fontSize: 13 }}>{r.title}</span>}
                  </div>
                  {r.date && <span className="muted" style={{ fontSize: 12 }}>{fmtDate(r.date)}</span>}
                </div>
                {r.body && <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6, margin: "6px 0 4px" }}>{r.body}</p>}
                {r.author && <div className="muted" style={{ fontSize: 12 }}>— {r.author}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
