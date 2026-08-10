"use client";

import { useEffect, useState } from "react";

interface StaffContact {
  customerId: string;
  name: string;
  email: string;
  role?: string;
  location?: string;
}

/**
 * Contact-picker modal for masquerading into a company. Opens a dialog that
 * fetches the company's contacts (GET /api/staff/company-contacts), lets the
 * staffer pick one, optionally enter a reason, then POSTs /api/staff/masquerade
 * with { companyId, customerId, reason } and navigates to the returned redirect.
 *
 * Styling reuses the staff console classes (btn/btn-ghost/card/tbl) so it stays
 * visually consistent with the surrounding table.
 */
export function MasqueradeModal({
  companyId,
  companyName,
  disabled,
}: {
  companyId: string;
  companyName: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<StaffContact[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  // Load contacts each time the modal opens (cheap; keeps data fresh).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/staff/company-contacts?companyId=${encodeURIComponent(companyId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load contacts"))))
      .then((d: { contacts: StaffContact[] }) => {
        if (cancelled) return;
        setContacts(d.contacts);
        // Preselect the sole contact so a single-contact company is one click.
        if (d.contacts.length === 1) setSelected(d.contacts[0].customerId);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load contacts");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, companyId]);

  function close() {
    setOpen(false);
    setSelected(null);
    setReason("");
    setContacts(null);
    setError("");
  }

  async function start() {
    if (!selected || starting) return;
    setStarting(true);
    setError("");
    try {
      const res = await fetch("/api/staff/masquerade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, customerId: selected, reason: reason.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || "Failed to start");
        return;
      }
      // Full navigation so the new buyer session applies everywhere.
      window.location.href = data.redirect || "/account";
    } catch {
      setError("Network error");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? "No contact to view as" : "View the storefront as a contact of this company"}
      >
        View as buyer
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`View as a contact of ${companyName}`}
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 800,
            background: "rgba(0,0,0,.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 520, maxHeight: "80vh", overflow: "auto", padding: 24, textAlign: "left" }}
          >
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div>
                <h2 className="text-h2" style={{ margin: 0, fontSize: 16 }}>View as buyer</h2>
                <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>{companyName}</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={close}
                aria-label="Close"
                style={{ flexShrink: 0 }}
              >
                Close
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              {loading ? (
                <div className="muted" style={{ fontSize: 13, padding: "16px 0" }}>Loading contacts…</div>
              ) : contacts && contacts.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                    Choose a contact
                  </span>
                  {contacts.map((c) => {
                    const active = selected === c.customerId;
                    return (
                      <label
                        key={c.customerId}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          border: `1px solid ${active ? "var(--primary, #7c3aed)" : "var(--line-2)"}`,
                          borderRadius: "var(--radius)",
                          padding: "10px 12px",
                          cursor: "pointer",
                          background: active ? "var(--surface-2, rgba(124,58,237,.05))" : "var(--bg)",
                        }}
                      >
                        <input
                          type="radio"
                          name="masq-contact"
                          value={c.customerId}
                          checked={active}
                          onChange={() => setSelected(c.customerId)}
                          style={{ marginTop: 3 }}
                        />
                        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                          {c.email && <span className="muted" style={{ fontSize: 12 }}>{c.email}</span>}
                          <span className="muted" style={{ fontSize: 11 }}>
                            {c.role || "No role"}
                            {c.location ? ` · ${c.location}` : ""}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="muted" style={{ fontSize: 13, padding: "16px 0" }}>
                  No contacts found for this company.
                </div>
              )}
            </div>

            <div style={{ marginTop: 16 }}>
              <label htmlFor="masq-reason" style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: 6 }}>
                Reason (optional)
              </label>
              <input
                id="masq-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Troubleshooting a failed order"
                style={{ width: "100%", height: 38, border: "1px solid var(--line-2)", borderRadius: "var(--radius)", padding: "0 12px", fontSize: 13, background: "var(--bg)", color: "var(--ink)", boxSizing: "border-box" }}
              />
            </div>

            {error && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 12, marginBottom: 0 }}>{error}</p>}

            <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={close} disabled={starting}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={start}
                disabled={!selected || starting}
              >
                {starting ? "Starting…" : "Start"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
