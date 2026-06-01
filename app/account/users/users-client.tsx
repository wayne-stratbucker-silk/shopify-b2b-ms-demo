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

  function roleCls(name: string): string {
    const n = name.toLowerCase();
    if (n === "admin") return "err";
    if (n === "buyer") return "info";
    return "muted";
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 className="text-h1">Team Members</h1>
        <button className="btn btn-primary" onClick={() => { setShowInvite(true); setInviteSuccess(""); }}>
          + Invite member
        </button>
      </div>

      {inviteSuccess && (
        <div style={{ background: "var(--success-fade, #f0fdf4)", border: "1px solid var(--success)", borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "var(--success)" }}>
          ✓ {inviteSuccess}
        </div>
      )}

      {members.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No team members yet. Invite your first member above.
        </div>
      ) : (
        <div className="card" style={{ overflow: "auto" }}>
          <table className="tbl" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Location</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>
                    {m.name}
                    {m.isMainContact && (
                      <span className="badge" style={{ marginLeft: 6, fontSize: 10 }}>Main</span>
                    )}
                  </td>
                  <td className="text-sm">{m.email}</td>
                  <td><span className={`status ${roleCls(m.role)}`}>{m.role}</span></td>
                  <td className="text-sm">{m.location}</td>
                  <td>
                    {!m.isMainContact && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--danger)", fontSize: 12 }}
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
        </div>
      )}

      {/* Invite dialog */}
      {showInvite && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 900,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div className="card" style={{ padding: 32, width: 400, maxWidth: "90vw" }}>
            <h2 className="text-h3" style={{ fontWeight: 700, marginBottom: 20 }}>Invite team member</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--muted)" }}>
                  FIRST NAME
                </label>
                <input
                  type="text"
                  value={inviteFirst}
                  onChange={(e) => setInviteFirst(e.target.value)}
                  placeholder="Jane"
                  style={{ width: "100%", height: 36, border: "1px solid var(--line-2)", borderRadius: "var(--radius)", padding: "0 10px", fontSize: 13, background: "var(--bg)", color: "var(--ink)", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--muted)" }}>
                  LAST NAME
                </label>
                <input
                  type="text"
                  value={inviteLast}
                  onChange={(e) => setInviteLast(e.target.value)}
                  placeholder="Doe"
                  style={{ width: "100%", height: 36, border: "1px solid var(--line-2)", borderRadius: "var(--radius)", padding: "0 10px", fontSize: 13, background: "var(--bg)", color: "var(--ink)", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--muted)" }}>
                WORK EMAIL *
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="jane@company.com"
                autoFocus
                style={{ width: "100%", height: 36, border: "1px solid var(--line-2)", borderRadius: "var(--radius)", padding: "0 10px", fontSize: 13, background: "var(--bg)", color: "var(--ink)", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "var(--muted)" }}>
                ROLE
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                style={{ width: "100%", height: 36, border: "1px solid var(--line-2)", borderRadius: "var(--radius)", padding: "0 10px", fontSize: 13, background: "var(--bg)", color: "var(--ink)", boxSizing: "border-box" }}
              >
                <option value="buyer">Buyer</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {inviteError && (
              <p style={{ color: "var(--danger)", fontSize: 12, marginBottom: 12 }}>{inviteError}</p>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                style={{ flex: 1 }}
              >
                {inviting ? "Inviting…" : "Send invite"}
              </button>
              <button
                className="btn btn-ghost"
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
