"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";

interface Props {
  quoteId: string;
}

export function QuoteMessageForm({ quoteId }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", message: trimmed }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to send message");
        return;
      }
      setMessage("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
        <Icon name="doc" size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 6, color: "var(--primary)" }} />
        Add a note
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <textarea
          className="input"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask a question or leave a note for your sales rep…"
          style={{ resize: "vertical" }}
          disabled={submitting}
        />
        {error && (
          <div style={{ fontSize: 12, color: "var(--danger)", padding: "6px 10px", background: "var(--danger-fade, #fff0f0)", borderRadius: "var(--radius)", border: "1px solid var(--danger)" }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="submit"
            className="btn btn-sm"
            disabled={submitting || !message.trim()}
          >
            <Icon name={sent ? "check" : "mail"} size={13} />
            {submitting ? "Sending…" : sent ? "Sent!" : "Send note"}
          </button>
        </div>
      </form>
    </div>
  );
}
