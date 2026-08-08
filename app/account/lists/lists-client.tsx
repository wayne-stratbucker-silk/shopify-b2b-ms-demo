"use client";

// New-list modal + per-row delete for the saved-lists page. Mirrors the BC
// Catalyst accelerator's lists-client UX (modal with name + description, inline
// delete) but wired to this app's Shopify metaobject-backed list routes:
//   POST   /api/lists        { name, description, visibility, sharedWith }
//   DELETE /api/lists/:id
// Lists can be scoped: Private (owner only), Company (everyone), or Shared with
// specific company users (visibility="shared" + sharedWith[] of Customer GIDs).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import type { ListVisibility } from "@/types";

type Contact = { customerId: string; name: string };

export function NewListButton({ contacts = [] }: { contacts?: Contact[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [visibility, setVisibility] = useState<ListVisibility>("company");
  const [sharedWith, setSharedWith] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function close() {
    setOpen(false);
    setName(""); setDesc(""); setVisibility("company"); setSharedWith(new Set()); setError("");
  }
  function toggleShare(id: string) {
    setSharedWith((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    if (visibility === "shared" && sharedWith.size === 0) { setError("Pick at least one person to share with"); return; }
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: desc.trim(),
          visibility,
          sharedWith: visibility === "shared" ? [...sharedWith] : [],
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setError(d.error ?? "Failed to create list"); return; }
      close();
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setPending(false);
    }
  }

  const labelStyle = { fontSize: 12, fontWeight: 500, color: "var(--ink-2)" } as const;

  return (
    <>
      <button className="btn btn-sm" onClick={() => setOpen(true)}>
        <Icon name="plus" size={14} />
        New list
      </button>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget && !pending) close(); }}
        >
          <div className="modal-card" style={{ "--modal-w": "440px" } as React.CSSProperties}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600 }}>New shopping list</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelStyle}>List name <span style={{ color: "var(--danger)" }}>*</span></span>
                <input autoFocus type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Job #1042 — Conduit rough-in" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelStyle}>Description (optional)</span>
                <input type="text" className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Notes for your team" />
              </label>

              {/* Visibility / scope */}
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={labelStyle}>Who can see this list</span>
                <select className="input" value={visibility} onChange={(e) => setVisibility(e.target.value as ListVisibility)}>
                  <option value="company">Everyone at my company</option>
                  <option value="private">Only me (private)</option>
                  <option value="shared">Specific people…</option>
                </select>
              </label>

              {visibility === "shared" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={labelStyle}>Share with</span>
                  {contacts.length === 0 ? (
                    <p className="muted" style={{ fontSize: 12, margin: 0 }}>No other company users to share with.</p>
                  ) : (
                    <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                      {contacts.map((c) => (
                        <label key={c.customerId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                          <input type="checkbox" className="checkbox" checked={sharedWith.has(c.customerId)} onChange={() => toggleShare(c.customerId)} />
                          <span>{c.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && <p style={{ margin: 0, fontSize: 12, color: "var(--danger)" }}>{error}</p>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={close} disabled={pending}>Cancel</button>
                <button type="submit" className="btn btn-sm" disabled={pending}>{pending ? "Creating…" : "Create list"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function DeleteListButton({ listId }: { listId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this list? This cannot be undone.")) return;
    setPending(true);
    try {
      await fetch(`/api/lists/${encodeURIComponent(listId)}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button className="btn btn-ghost btn-xs" onClick={handleDelete} disabled={pending} style={{ color: "var(--danger)" }}>
      {pending ? "…" : "Delete"}
    </button>
  );
}
