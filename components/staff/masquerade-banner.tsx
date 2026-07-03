"use client";

import { useEffect, useState } from "react";

interface MasqState { masquerading: boolean; company?: string; name?: string; staff?: string }

/**
 * Shown while a staff member is masquerading as a company buyer. Polls
 * /api/staff/masquerade once on mount; renders nothing otherwise. "Exit"
 * drops the buyer session and returns to the staff dashboard.
 */
export function StaffMasqueradeBanner() {
  const [state, setState] = useState<MasqState | null>(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    fetch("/api/staff/masquerade")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d))
      .catch(() => {});
  }, []);

  if (!state?.masquerading) return null;

  async function exit() {
    setEnding(true);
    await fetch("/api/staff/end-masquerade", { method: "POST" }).catch(() => {});
    window.location.href = "/staff";
  }

  return (
    <div style={{ background: "#7c3aed", color: "#fff", padding: "8px 0", fontSize: 12, fontWeight: 500, position: "sticky", top: 0, zIndex: 700 }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ background: "rgba(255,255,255,.2)", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}>Staff view</span>
          <span>Viewing as <strong>{state.company || state.name}</strong>{state.staff && <span style={{ opacity: 0.75, marginLeft: 6 }}>({state.staff})</span>}</span>
        </span>
        <button type="button" onClick={exit} disabled={ending}
                style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.3)", color: "#fff", borderRadius: 4, padding: "4px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", flexShrink: 0 }}>
          {ending ? "Exiting…" : "Exit to dashboard"}
        </button>
      </div>
    </div>
  );
}
