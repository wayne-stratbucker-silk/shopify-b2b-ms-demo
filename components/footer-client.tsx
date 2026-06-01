"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocation } from "./location-provider";

export function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Something went wrong — please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "stretch" }}>
      {submitted ? (
        <div style={{ gridColumn: "1 / -1", display: "inline-flex", alignItems: "center", gap: 8, height: 38, padding: "0 14px", background: "var(--primary-fade)", color: "var(--primary)", borderRadius: "var(--radius)", fontSize: 13 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", flexShrink: 0 }} />
          Thanks — confirmation sent to <b style={{ color: "var(--ink)" }}>{email}</b>.
        </div>
      ) : (
        <>
          <label style={{ display: "flex", alignItems: "stretch", background: "var(--bg)", border: "1px solid var(--line-2)", borderRadius: "var(--radius)", height: 38 }}>
            <span className="sr-only">Work email</span>
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={{ flex: 1, minWidth: 0, background: "transparent", border: 0, outline: 0, padding: "0 12px", fontFamily: "inherit", fontSize: 13, color: "var(--ink)" }}
            />
          </label>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Subscribing…" : "Subscribe"}
          </button>
        </>
      )}
      {error && (
        <p style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--danger)", margin: "4px 0 0" }}>{error}</p>
      )}
      <p style={{ gridColumn: "1 / -1", fontFamily: "var(--font-geist-mono)", fontSize: 11, color: "var(--muted)", margin: "4px 0 0" }}>
        By subscribing you agree to ACME&apos;s <Link href="/privacy" style={{ color: "var(--muted)", textDecoration: "underline" }}>privacy policy</Link>. Unsubscribe anytime.
      </p>
    </form>
  );
}

export function FooterContact() {
  const { activeContact } = useLocation();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, color: "var(--muted)" }}>
      <div>
        <b style={{ color: "var(--ink)", fontWeight: 500 }}>Customer Care</b>
        {activeContact.hours && <> — {activeContact.hours}</>}
      </div>
      {activeContact.phone && (
        <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12 }}>
          <a href={`tel:${activeContact.phone.replace(/\s/g, "")}`} style={{ color: "var(--muted)", textDecoration: "none" }}>{activeContact.phone}</a>
        </div>
      )}
      {activeContact.email && (
        <div style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12 }}>
          <a href={`mailto:${activeContact.email}`} style={{ color: "var(--muted)", textDecoration: "none" }}>{activeContact.email}</a>
        </div>
      )}
    </div>
  );
}
