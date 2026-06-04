"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";

interface Props {
  quoteId: string;
  /** Current expiry as an ISO string (or empty when unset). */
  currentExpiry?: string;
}

function toDateInput(iso?: string): string {
  if (!iso) return "";
  // Accept ISO datetime or plain date; input[type=date] wants yyyy-mm-dd.
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/**
 * Admin-only control to set or extend a quote's expiry date. Drives the
 * "expiring soon" alerts on the quotes list via the quote.expires_at metafield.
 */
export function QuoteExpiryEditor({ quoteId, currentExpiry }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(toDateInput(currentExpiry));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!date) {
      setError("Pick a date");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // End-of-day so the quote stays valid through the selected date.
      const expiresAt = new Date(`${date}T23:59:59`).toISOString();
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_expiry", expiresAt }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to set expiry");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="text-xs" style={{ color: "var(--muted)", marginBottom: 8, fontWeight: 600 }}>
        {currentExpiry ? "Quote expiry" : "Set quote expiry"}
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="date"
          className="input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={saving}
          style={{ flex: 1, fontSize: 13, padding: "6px 8px" }}
        />
        <button
          type="button"
          className="btn btn-sm"
          onClick={save}
          disabled={saving}
          title="Save expiry date"
        >
          <Icon name={saved ? "check" : "edit"} size={13} />
          {saving ? "…" : saved ? "Saved" : "Set"}
        </button>
      </div>
      {error && (
        <p className="text-xs" style={{ color: "var(--danger)", marginTop: 6 }}>{error}</p>
      )}
    </div>
  );
}
