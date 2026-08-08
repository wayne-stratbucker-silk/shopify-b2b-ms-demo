"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";

interface Member {
  id: string;
  isMainContact: boolean;
  customerId: string;
  email: string;
  name: string;
  role: string;
  location: string;
}

function rolePillCls(name: string): string {
  const n = name.toLowerCase();
  if (n === "admin") return "rolepill rolepill-admin";
  if (n === "buyer") return "rolepill rolepill-buyer";
  return "rolepill";
}

function initials(name: string): string {
  return (
    name
      .split(" ")
      .map((w) => w[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

// ─── Invite user modal ────────────────────────────────────────────────────────

function InviteUserModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("buyer");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to invite user");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 900,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card" style={{ "--modal-w": "440px" } as React.CSSProperties}>
        <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600 }}>Invite user</h3>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-grid-2">
            <label className="field">
              <span>First name <span style={{ color: "var(--danger)" }}>*</span></span>
              <input
                autoFocus
                type="text"
                required
                className="input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                disabled={pending}
              />
            </label>
            <label className="field">
              <span>Last name <span style={{ color: "var(--danger)" }}>*</span></span>
              <input
                type="text"
                required
                className="input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                disabled={pending}
              />
            </label>
          </div>

          <label className="field">
            <span>Email <span style={{ color: "var(--danger)" }}>*</span></span>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
              disabled={pending}
            />
          </label>

          <label className="field">
            <span>Role <span style={{ color: "var(--danger)" }}>*</span></span>
            <select
              className="select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={pending}
            >
              <option value="buyer">Buyer</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          {error && <p style={{ margin: 0, fontSize: 12, color: "var(--danger)" }}>{error}</p>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={pending}>
              Cancel
            </button>
            <button type="submit" className="btn btn-sm" disabled={pending || !email.trim()}>
              {pending ? "Inviting…" : "Send invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Remove user button (2-step inline confirm) ───────────────────────────────

function RemoveUserButton({ contactId, name }: { contactId: string; name: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleRemove() {
    setPending(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(contactId)}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to remove user");
        return;
      }
      setConfirm(false);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setPending(false);
    }
  }

  if (confirm) {
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>Remove {name}?</span>
        <button
          className="btn btn-xs"
          style={{ background: "var(--danger)", color: "#fff", border: "none" }}
          onClick={handleRemove}
          disabled={pending}
        >
          {pending ? "Removing…" : "Confirm"}
        </button>
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => { setConfirm(false); setError(""); }}
          disabled={pending}
        >
          Cancel
        </button>
        {error && <span style={{ fontSize: 11, color: "var(--danger)" }}>{error}</span>}
      </div>
    );
  }

  return (
    <button
      className="btn btn-ghost btn-xs"
      style={{ color: "var(--danger)" }}
      onClick={() => setConfirm(true)}
    >
      <Icon name="trash" size={12} />
      Remove
    </button>
  );
}

// ─── Users page client ────────────────────────────────────────────────────────

export function UsersClient({
  members,
  currentEmail,
}: {
  members: Member[];
  currentEmail: string;
}) {
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div>
      <div className="page-h">
        <div>
          <h1>Users &amp; roles</h1>
          <p className="sub">{members.length} user{members.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-sm" onClick={() => setShowInvite(true)}>
            <Icon name="plus" size={14} />
            Invite user
          </button>
        </div>
      </div>

      <div className="card">
        <table className="tbl tbl-mobile-cards">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Location</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{ textAlign: "center", padding: "32px 0", color: "var(--muted)", fontSize: 13 }}
                >
                  No users found.
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const isCurrentUser = m.email === currentEmail;
                return (
                  <tr key={m.id}>
                    <td className="col-primary">
                      <div className="row" style={{ gap: 10, alignItems: "center" }}>
                        <div className="av">{initials(m.name)}</div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>
                          {m.name}
                          {isCurrentUser && (
                            <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>(you)</span>
                          )}
                          {m.isMainContact && (
                            <span
                              className="muted"
                              style={{ marginLeft: 6, fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".04em" }}
                            >
                              · Main
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="col-meta mono" style={{ fontSize: 12 }}>{m.email}</td>
                    <td className="col-status">
                      <span className={rolePillCls(m.role)}>{m.role}</span>
                    </td>
                    <td className="col-hide muted" style={{ fontSize: 12 }}>{m.location}</td>
                    <td className="col-action">
                      {!isCurrentUser && !m.isMainContact && (
                        <RemoveUserButton contactId={m.id} name={m.name} />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showInvite && <InviteUserModal onClose={() => setShowInvite(false)} />}
    </div>
  );
}
