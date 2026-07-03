"use client";

import { useState } from "react";

export function MasqueradeButton({ companyId, disabled }: { companyId: string; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/staff/masquerade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || "Failed"); return; }
      // Full navigation so the new buyer session applies everywhere.
      window.location.href = data.redirect || "/account";
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
      <button type="button" className="btn btn-ghost btn-xs" onClick={go} disabled={busy || disabled}
              title={disabled ? "No contact to view as" : "View the storefront as this company"}>
        {busy ? "Loading…" : "View as buyer"}
      </button>
      {error && <span style={{ color: "var(--danger)", fontSize: 11 }}>{error}</span>}
    </div>
  );
}
