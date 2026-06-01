"use client";

import { useState } from "react";
import { Icon } from "./ui/icons";

export interface ListItem {
  productId: number;
  variantId?: number;
  qty: number;
}

interface ShoppingList {
  id: number;
  name: string;
  description?: string;
}

interface SaveToListModalProps {
  items: ListItem[];
  trigger?: React.ReactNode;
  triggerClassName?: string;
  triggerLabel?: string;
  /** Fired after items are successfully added to a list (for analytics). */
  onAdded?: (listName: string) => void;
}

export function SaveToListModal({
  items,
  trigger,
  triggerClassName = "btn btn-ghost btn-lg btn-block",
  triggerLabel = "Add to list",
  onAdded,
}: SaveToListModalProps) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<ShoppingList[] | null>(null);
  const [loadingLists, setLoadingLists] = useState(false);
  const [listError, setListError] = useState("");

  const [newName, setNewName] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [pendingListId, setPendingListId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState("");

  function openModal() {
    setOpen(true);
    setSuccess(null);
    setError("");
    setCreatingNew(false);
    setNewName("");
    if (!lists) loadLists();
  }

  function close() {
    setOpen(false);
    setSuccess(null);
    setError("");
  }

  async function loadLists() {
    setLoadingLists(true);
    setListError("");
    try {
      const res = await fetch("/api/b2b/lists");
      if (!res.ok) { setListError("Could not load lists"); return; }
      const data = await res.json() as { lists: ShoppingList[] };
      setLists(data.lists ?? []);
    } catch {
      setListError("Could not load lists");
    } finally {
      setLoadingLists(false);
    }
  }

  async function addToList(listId: number, listName: string) {
    setPendingListId(listId);
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/b2b/lists/${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to add to list");
        return;
      }
      setSuccess(listName);
      onAdded?.(listName);
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
      setPendingListId(null);
    }
  }

  async function createAndAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/b2b/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json() as { id?: number; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to create list");
        return;
      }
      const id = data.id!;
      // Refresh lists cache
      setLists(null);
      await addToList(id, newName.trim());
      setCreatingNew(false);
      setNewName("");
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {trigger ? (
        <span onClick={openModal} style={{ cursor: "pointer" }}>{trigger}</span>
      ) : (
        <button className={triggerClassName} onClick={openModal}>
          <Icon name="heart" size={16} />
          {triggerLabel}
        </button>
      )}

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
            zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <div
            className="modal-card"
            style={{
              // Desktop width 420px; on phones the .modal-card rule clamps to 92vw.
              "--modal-w": "420px",
              display: "flex", flexDirection: "column", gap: 16,
            } as React.CSSProperties}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Save to list</h3>
              <button
                onClick={close}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--muted)" }}
                aria-label="Close"
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {success ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", background: "var(--success-fade)",
                  borderRadius: "var(--radius)", border: "1px solid #c6d6c9",
                }}>
                  <Icon name="check" size={16} style={{ color: "var(--success)", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "var(--success)" }}>
                    Added to <b style={{ color: "var(--ink)" }}>{success}</b>
                  </span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={close}>Done</button>
              </div>
            ) : (
              <>
                {/* Existing lists */}
                {loadingLists && (
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Loading lists…</p>
                )}
                {listError && (
                  <p style={{ fontSize: 13, color: "var(--err)", margin: 0 }}>{listError}</p>
                )}
                {lists !== null && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
                    {lists.length === 0 && !creatingNew && (
                      <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                        No lists yet — create one below.
                      </p>
                    )}
                    {lists.map((list) => (
                      <button
                        key={list.id}
                        onClick={() => addToList(list.id, list.name)}
                        disabled={saving}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "10px 14px", border: "1px solid var(--line-2)",
                          borderRadius: "var(--radius)", background: "var(--surface)",
                          cursor: "pointer", fontSize: 13, textAlign: "left", gap: 8,
                          opacity: saving && pendingListId !== list.id ? 0.5 : 1,
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{list.name}</span>
                        {saving && pendingListId === list.id ? (
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>Adding…</span>
                        ) : (
                          <Icon name="plus" size={13} style={{ color: "var(--primary)", flexShrink: 0 }} />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Create new */}
                {!creatingNew ? (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setCreatingNew(true)}
                    disabled={saving}
                    style={{ alignSelf: "flex-start" }}
                  >
                    <Icon name="plus" size={13} />
                    Create new list
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)" }}>
                      New list name
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        autoFocus
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") createAndAdd(); }}
                        placeholder="e.g. Job #1042 — Conduit rough-in"
                        disabled={saving}
                        style={{
                          flex: 1, padding: "8px 12px", border: "1px solid var(--line-2)",
                          borderRadius: "var(--radius)", fontSize: 13,
                          fontFamily: "inherit", background: "var(--surface)", color: "var(--ink)",
                        }}
                      />
                      <button
                        className="btn btn-sm"
                        onClick={createAndAdd}
                        disabled={saving || !newName.trim()}
                      >
                        {saving ? "…" : "Create"}
                      </button>
                    </div>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => { setCreatingNew(false); setNewName(""); }}
                      disabled={saving}
                      style={{ alignSelf: "flex-start" }}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {error && (
                  <p style={{ fontSize: 12, color: "var(--err)", margin: 0 }}>{error}</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
