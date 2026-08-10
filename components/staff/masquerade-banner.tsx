"use client";

import { useEffect, useState } from "react";

interface MasqState {
  masquerading: boolean;
  company?: string;
  name?: string;
  staff?: string;
  mode?: "read_only" | "assist";
  /** Epoch ms hard expiry of the grant. */
  expiresAt?: number;
}

/** mm:ss for a millisecond duration, clamped at zero. */
function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/**
 * Shown while a staff member is masquerading as a company buyer. Polls
 * /api/staff/masquerade once on mount; renders nothing otherwise. Displays a
 * mode pill (READ ONLY / ASSIST) and a live mm:ss countdown to expiry. "Exit"
 * drops the buyer session and returns to the staff dashboard.
 */
export function StaffMasqueradeBanner() {
  const [state, setState] = useState<MasqState | null>(null);
  const [ending, setEnding] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    fetch("/api/staff/masquerade")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setState(d))
      .catch(() => {});
  }, []);

  // Tick every second so the countdown re-renders. Only runs once we know an
  // expiry exists (avoids a needless interval when not masquerading).
  useEffect(() => {
    if (!state?.masquerading || !state.expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state?.masquerading, state?.expiresAt]);

  if (!state?.masquerading) return null;

  async function exit() {
    setEnding(true);
    await fetch("/api/staff/end-masquerade", { method: "POST" }).catch(() => {});
    window.location.href = "/staff";
  }

  const modeLabel = state.mode === "assist" ? "Assist" : "Read only";
  const remaining = state.expiresAt != null ? state.expiresAt - now : null;
  const expired = remaining != null && remaining <= 0;

  return (
    <div style={{ background: "#7c3aed", color: "#fff", padding: "8px 0", fontSize: 12, fontWeight: 500, position: "sticky", top: 0, zIndex: 700 }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ background: "rgba(255,255,255,.2)", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}>Staff view</span>
          <span
            title={state.mode === "assist" ? "Assist mode — rep-assisted authoring allowed" : "Read-only mode — writes are blocked"}
            style={{ background: "rgba(255,255,255,.2)", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase" }}
          >
            {modeLabel}
          </span>
          <span>Viewing as <strong>{state.company || state.name}</strong>{state.staff && <span style={{ opacity: 0.75, marginLeft: 6 }}>({state.staff})</span>}</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {remaining != null && (
            <span
              title="Time remaining before this session expires"
              className="mono"
              style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", opacity: expired ? 1 : 0.9, fontWeight: 600 }}
            >
              {expired ? "Expired" : fmtCountdown(remaining)}
            </span>
          )}
          <button type="button" onClick={exit} disabled={ending}
                  style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.3)", color: "#fff", borderRadius: 4, padding: "4px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
            {ending ? "Exiting…" : "Exit to dashboard"}
          </button>
        </span>
      </div>
    </div>
  );
}
