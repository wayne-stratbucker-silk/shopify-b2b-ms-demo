"use client";

import { useState } from "react";

interface Props {
  quoteId: string;
}

export function AdminCompleteButton({ quoteId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    if (!confirm("Complete this order on behalf of the buyer? This converts the draft order to a real Shopify order.")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      window.location.href = data.orderStatusUrl;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="btn btn-block"
        disabled={loading}
        onClick={handleComplete}
        style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
      >
        {loading ? "Processing…" : "Complete Order (Admin)"}
      </button>
      {error && (
        <p className="text-xs" style={{ color: "var(--error, #c00)", marginTop: 6 }}>
          {error}
        </p>
      )}
    </div>
  );
}
