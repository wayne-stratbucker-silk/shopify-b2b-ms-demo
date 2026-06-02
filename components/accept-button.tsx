"use client";

import { useState } from "react";

interface Props {
  quoteId: string;
}

export function AcceptButton({ quoteId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
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
        className="btn btn-primary btn-block"
        disabled={loading}
        onClick={handleAccept}
      >
        {loading ? "Processing…" : "Accept & Checkout →"}
      </button>
      {error && (
        <p className="text-xs" style={{ color: "var(--error, #c00)", marginTop: 6 }}>
          {error}
        </p>
      )}
    </div>
  );
}
