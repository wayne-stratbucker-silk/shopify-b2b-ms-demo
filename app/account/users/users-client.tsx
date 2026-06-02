"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Member {
  id: string;
  isMainContact: boolean;
  customerId: string;
  email: string;
  name: string;
  role: string;
  location: string;
}

export function UsersClient({ members: initial }: { members: Member[] }) {
  const router = useRouter();
  const [members, setMembers] = useState(initial);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirst, setInviteFirst] = useState("");
  const [inviteLast, setInviteLast] = useState("");
  const [inviteRole, setInviteRole] = useState("buyer");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  function rolePillCls(name: string): string {
    const n = name.toLowerCase();
    if (n === "admin") return "rolepill rolepill-admin";
    if (n === "buyer") return "rolepill rolepill-buyer";
    return "rolepill";
  }

  function initials(name: string): string {
    return name.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "?";
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          firstName: inviteFirst.trim(),
          lastName: inviteLast.trim(),
          role: inviteRole,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setInviteError(data.error ?? "Failed to invite user");
        return;
      }
      setInviteSuccess(`${inviteEmail} has been added to your company.`);
      setInviteEmail("");
      setInviteFirst("");
      setInviteLast("");
      setInviteRole("buyer");
      setShowInvite(false);
      router.refresh();
    } catch {
      setInviteError("Network error — please try again.");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(contactId: string, email: string) {
    if (!confirm(`Remove ${email} from your company?`)) return;
    setRemovingId(contactId);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(contactId)}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        alert(d.error ?? "Failed to remove user");
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== contactId));
    } catch {
      alert("Network error — please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div>
      <div className="page-h">
        <div>
          <h1>Team members</h1>
        </div>
        <button className="btn btn-sm" onClick={() => { setShowInvite(true); setInviteSuccess(""); }}>
          + Invite member
        </button>
      </div>

      {inviteSuccess && (
        <div className="alert alert-ok" style={{ marginBottom: 16 }}>
          ✓ {inviteSuccess}
        </div>
      )}

      {members.length === 0 ? (
        <div className="card" style={{ padding: "40px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          No team members yet. Invite your first member above.
        </div>
      ) : (
        <table className="tbl tbl-mobile-cards">
          <thead>
            <tr>
              <th>User</th>
              <th className="col-hide">Email</th>
              <th className="col-status">Role</th>
              <th className="col-hide">Location</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td className="col-primary">
                  <div className="row" style={{ gap: 10, alignItems: "center" }}>
                    <div className="av">{initials(m.name)}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {m.name}
                        {m.isMainContact && (
                          <span className="muted" style={{ marginLeft: 6, fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".04em" }}>· Main</span>
                        )}
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className="col-hide muted" style={{ fontSize: 13 }}>{m.email}</td>
                <td className="col-status">
                  <span className={rolePillCls(m.role)}>{m.role}</span>
                </td>
                <td className="col-hide muted" style={{ fontSize: 12 }}>{m.location}</td>
                <td className="col-action">
                  {!m.isMainContact && (
                    <button
                      className="btn btn-ghost btn-xs"
                      style={{ color: "var(--danger)" }}
                      onClick={() => handleRemove(m.id, m.email)}
                      disabled={removingId === m.id}
                    >
                      {removingId === m.id ? "Removing…" : "Remove"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Invite dialog */}
      {showInvite && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 900,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div className="modal-card" style={{ padding: 32, width: 400, maxWidth: "90vw" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>Invite team member</h2>

            <div className="auth-grid-2" style={{ marginBottom: 12 }}>
              <div className="field">
                <label htmlFor="invite-first">First name</label>
                <input
                  id="invite-first"
                  type="text"
                  className="input"
                  value={inviteFirst}
                  onChange={(e) => setInviteFirst(e.target.value)}
                  placeholder="Jane"
                />
              </div>
              <div className="field">
                <label htmlFor="invite-last">Last name</label>
                <input
                  id="invite-last"
                  type="text"
                  className="input"
                  value={inviteLast}
                  onChange={(e) => setInviteLast(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="invite-email">Work email *</label>
              <input
                id="invite-email"
                type="email"
                className="input"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="jane@company.com"
                autoFocus
              />
            </div>

            <div className="field" style={{ marginBottom: 20 }}>
              <label htmlFor="invite-role">Role</label>
              <select
                id="invite-role"
                className="select"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="buyer">Buyer</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {inviteError && (
              <div className="alert alert-err" style={{ marginBottom: 12, fontSize: 13 }}>{inviteError}</div>
            )}

            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn btn-block"
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                style={{ flex: 1 }}
              >
                {inviting ? "Inviting…" : "Send invite"}
              </button>
              <button
                className="btn btn-ghost btn-block"
                onClick={() => { setShowInvite(false); setInviteError(""); }}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
