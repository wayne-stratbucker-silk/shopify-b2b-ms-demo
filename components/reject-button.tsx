"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  quoteId: string;
}

export function RejectButton({ quoteId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReject() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-block"
        onClick={() => setOpen(true)}
        style={{ borderColor: "var(--error, #c00)", color: "var(--error, #c00)" }}
      >
        Reject Quote
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea
        className="input"
        rows={3}
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        style={{ width: "100%", resize: "vertical", fontSize: 13 }}
      />
      {error && (
        <p className="text-xs" style={{ color: "var(--error, #c00)" }}>{error}</p>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="btn btn-block"
          disabled={loading}
          onClick={handleReject}
          style={{ borderColor: "var(--error, #c00)", color: "var(--error, #c00)" }}
        >
          {loading ? "Rejecting…" : "Confirm Reject"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-block"
          disabled={loading}
          onClick={() => { setOpen(false); setReason(""); setError(null); }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
