"use client";

// New-list modal + per-row delete for the saved-lists page. Mirrors the BC
// Catalyst accelerator's lists-client UX (modal with name + description, inline
// delete) but wired to this app's Shopify metaobject-backed list routes:
//   POST   /api/lists        { name, description }
//   DELETE /api/lists/:id
// List ids are Shopify Metaobject GIDs (strings).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";

export function NewListButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function close() {
    setOpen(false);
    setName("");
    setDesc("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(d.error ?? "Failed to create list");
        return;
      }
      close();
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setPending(false);
    }
  }

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
          <div className="modal-card" style={{ "--modal-w": "400px" } as React.CSSProperties}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600 }}>New shopping list</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)" }}>
                  List name <span style={{ color: "var(--danger)" }}>*</span>
                </span>
                <input
                  autoFocus
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Job #1042 — Conduit rough-in"
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)" }}>Description (optional)</span>
                <input
                  type="text"
                  className="input"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Notes for your team"
                />
              </label>
              {error && <p style={{ margin: 0, fontSize: 12, color: "var(--danger)" }}>{error}</p>}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={close} disabled={pending}>Cancel</button>
                <button type="submit" className="btn btn-sm" disabled={pending}>
                  {pending ? "Creating…" : "Create list"}
                </button>
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
    <button
      className="btn btn-ghost btn-xs"
      onClick={handleDelete}
      disabled={pending}
      style={{ color: "var(--danger)" }}
    >
      {pending ? "…" : "Delete"}
    </button>
  );
}
