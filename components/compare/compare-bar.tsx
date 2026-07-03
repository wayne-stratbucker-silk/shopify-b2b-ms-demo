"use client";

import Link from "next/link";
import { useCompare } from "./compare-provider";

/** Fixed bottom bar summarizing the compare set; hidden when empty. */
export function CompareBar() {
  const compare = useCompare();
  if (!compare || compare.items.length === 0) return null;

  const href = `/compare?handles=${compare.items.map((i) => encodeURIComponent(i.handle)).join(",")}`;

  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 800, background: "var(--bg, #fff)", borderTop: "1px solid var(--line)", boxShadow: "0 -4px 20px rgba(0,0,0,.08)" }}>
      <div className="container" style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Compare ({compare.items.length}/{compare.max})</span>
        <div style={{ display: "flex", gap: 8, flex: 1, minWidth: 0, flexWrap: "wrap" }}>
          {compare.items.map((i) => (
            <span key={i.handle} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, border: "1px solid var(--line-2)", borderRadius: 999, padding: "3px 6px 3px 10px", maxWidth: 200 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.name}</span>
              <button type="button" onClick={() => compare.remove(i.handle)} aria-label={`Remove ${i.name}`} style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted)", fontSize: 14, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={compare.clear}>Clear</button>
          <Link href={href} className={`btn btn-primary btn-sm ${compare.items.length < 2 ? "is-disabled" : ""}`} aria-disabled={compare.items.length < 2}
                style={compare.items.length < 2 ? { pointerEvents: "none", opacity: 0.5 } : undefined}>
            Compare
          </Link>
        </div>
      </div>
    </div>
  );
}
