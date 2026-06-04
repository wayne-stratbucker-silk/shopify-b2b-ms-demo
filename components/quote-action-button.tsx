"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  quoteId: string;
  /** Server action name handled by POST /api/quotes/[id] (e.g. "approve", "email"). */
  action: string;
  label: string;
  pendingLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Optional browser confirm() prompt before firing. */
  confirmMessage?: string;
}

/**
 * Client button that fires a quote action against POST /api/quotes/[id] as JSON
 * and refreshes the route on success. Replaces the older native <form> POSTs,
 * which broke because the route parses the body with req.json().
 */
export function QuoteActionButton({
  quoteId,
  action,
  label,
  pendingLabel = "Working…",
  className = "btn btn-block",
  style,
  confirmMessage,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (confirmMessage && !confirm(confirmMessage)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.refresh();
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
        className={className}
        style={style}
        disabled={loading}
        onClick={handleClick}
      >
        {loading ? pendingLabel : label}
      </button>
      {error && (
        <p className="text-xs" style={{ color: "var(--error, #c00)", marginTop: 6 }}>
          {error}
        </p>
      )}
    </div>
  );
}
