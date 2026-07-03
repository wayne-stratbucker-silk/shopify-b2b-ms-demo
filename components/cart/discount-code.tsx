"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DiscountCode({ appliedCode }: { appliedCode?: string }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(payload: { code?: string; clear?: boolean }) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/cart/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.applied === false) {
        setError(data.error || "Could not apply code");
        return;
      }
      setCode("");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (appliedCode) {
    return (
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "var(--bg-2, #f6f7f9)", border: "1px solid var(--line-2)", borderRadius: "var(--radius)", padding: "8px 12px" }}>
        <span className="text-sm" style={{ fontWeight: 600 }}>
          <span style={{ color: "var(--success, #16a34a)", marginRight: 6 }}>✓</span>
          {appliedCode}
        </span>
        <button type="button" className="btn btn-ghost btn-xs" disabled={busy} onClick={() => submit({ clear: true })}>
          Remove
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--muted)" }}>
        DISCOUNT CODE
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && code.trim() && submit({ code: code.trim() })}
          placeholder="Enter code"
          style={{ flex: 1, height: 38, border: "1px solid var(--line-2)", borderRadius: "var(--radius)", padding: "0 12px", fontSize: 13, background: "var(--bg)", color: "var(--ink)", boxSizing: "border-box", textTransform: "uppercase" }}
        />
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !code.trim()} onClick={() => submit({ code: code.trim() })}>
          {busy ? "…" : "Apply"}
        </button>
      </div>
      {error && <p className="text-xs" style={{ color: "var(--danger)", marginTop: 6 }}>{error}</p>}
    </div>
  );
}
