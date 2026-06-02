"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import type { QuoteStatus } from "@/types";

interface Props {
  quoteId: string;
  status: QuoteStatus;
  canRequestChanges: boolean;
}

export function QuoteActions({ quoteId, status, canRequestChanges }: Props) {
  const router = useRouter();
  const [duplicating, setDuplicating] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canReload = canRequestChanges && (status === "new" || status === "in_process");

  async function handleDuplicate() {
    setDuplicating(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/duplicate`, { method: "POST" });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to duplicate quote");
        return;
      }
      router.push("/account/quotes/cart");
    } catch {
      setError("Network error — please try again");
    } finally {
      setDuplicating(false);
    }
  }

  async function handleReloadToCart() {
    setReloading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reload_to_cart" }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to reload quote");
        return;
      }
      router.push("/account/quotes/cart");
    } catch {
      setError("Network error — please try again");
    } finally {
      setReloading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {canReload && (
        <button
          className="btn btn-ghost btn-block"
          style={{ fontSize: 13 }}
          onClick={handleReloadToCart}
          disabled={reloading}
        >
          <Icon name="edit" size={14} />
          {reloading ? "Loading…" : "Request changes"}
        </button>
      )}
      <button
        className="btn btn-ghost btn-block"
        style={{ fontSize: 13 }}
        onClick={handleDuplicate}
        disabled={duplicating}
      >
        <Icon name="copy" size={14} />
        {duplicating ? "Loading…" : "Use as template"}
      </button>
      {error && (
        <div style={{ fontSize: 11, color: "var(--danger)" }}>{error}</div>
      )}
    </div>
  );
}
