"use client";

import { useState, useEffect } from "react";

interface CustomerAddress {
  id: string;
  firstName?: string;
  lastName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
  phone?: string;
}

const EMPTY_FORM = { firstName: "", lastName: "", address1: "", address2: "", city: "", province: "", zip: "", country: "", phone: "" };

export function AddressesClient() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/addresses")
      .then(r => r.json() as Promise<CustomerAddress[]>)
      .then(data => setAddresses(data))
      .catch(() => setAddresses([]))
      .finally(() => setLoading(false));
  }, []);

  function setField(k: keyof typeof EMPTY_FORM, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleAdd() {
    if (!form.address1 || !form.city || !form.zip) {
      setError("Street address, city, and zip are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json() as { error?: string; id?: string };
      if (!res.ok) { setError(data.error ?? "Failed to add address"); return; }
      setSuccess("Address added.");
      setShowAdd(false);
      setForm(EMPTY_FORM);
      const updated = await fetch("/api/addresses").then(r => r.json() as Promise<CustomerAddress[]>);
      setAddresses(updated);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(addressId: string) {
    if (!confirm("Remove this address from your account?")) return;
    setRemovingId(addressId);
    try {
      const res = await fetch(`/api/addresses/${encodeURIComponent(addressId)}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        alert(d.error ?? "Failed to remove address");
        return;
      }
      setAddresses(prev => prev.filter(a => a.id !== addressId));
    } catch {
      alert("Network error — please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  const inputStyle = {
    width: "100%", height: 36, border: "1px solid var(--line-2)", borderRadius: "var(--radius)",
    padding: "0 10px", fontSize: 13, background: "var(--bg)", color: "var(--ink)", boxSizing: "border-box" as const,
  };
  const labelStyle = { display: "block" as const, fontSize: 12, fontWeight: 600 as const, marginBottom: 4, color: "var(--muted)" };

  return (
    <div style={{ marginTop: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 className="text-h2">My Addresses</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowAdd(true); setError(""); setSuccess(""); }}>
          + Add address
        </button>
      </div>

      {success && (
        <div style={{ background: "var(--success-fade, #f0fdf4)", border: "1px solid var(--success)", borderRadius: "var(--radius)", padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "var(--success)" }}>
          ✓ {success}
        </div>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>Loading addresses…</p>
      ) : addresses.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
          No saved addresses. Add one above to speed up checkout.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {addresses.map(addr => {
            const name = [addr.firstName, addr.lastName].filter(Boolean).join(" ");
            const cityLine = [addr.city, addr.province, addr.zip].filter(Boolean).join(", ");
            return (
              <div key={addr.id} className="card" style={{ padding: 20 }}>
                {name && <div style={{ fontWeight: 600, marginBottom: 6 }}>{name}</div>}
                <div className="text-sm" style={{ lineHeight: 1.7, color: "var(--ink-2)" }}>
                  {addr.address1 && <div>{addr.address1}</div>}
                  {addr.address2 && <div>{addr.address2}</div>}
                  {cityLine && <div>{cityLine}</div>}
                  {addr.country && <div>{addr.country}</div>}
                  {addr.phone && <div style={{ color: "var(--muted)", marginTop: 4 }}>{addr.phone}</div>}
                </div>
                <div style={{ marginTop: 12 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: "var(--danger)", fontSize: 12 }}
                    onClick={() => handleRemove(addr.id)}
                    disabled={removingId === addr.id}
                  >
                    {removingId === addr.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add address modal */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="card" style={{ padding: 32, width: 440, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 className="text-h3" style={{ fontWeight: 700, marginBottom: 20 }}>Add address</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>FIRST NAME</label>
                <input style={inputStyle} value={form.firstName} onChange={e => setField("firstName", e.target.value)} placeholder="Jane" />
              </div>
              <div>
                <label style={labelStyle}>LAST NAME</label>
                <input style={inputStyle} value={form.lastName} onChange={e => setField("lastName", e.target.value)} placeholder="Doe" />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>STREET ADDRESS *</label>
              <input style={inputStyle} value={form.address1} onChange={e => setField("address1", e.target.value)} placeholder="123 Main St" autoFocus />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>APT / SUITE / UNIT</label>
              <input style={inputStyle} value={form.address2} onChange={e => setField("address2", e.target.value)} placeholder="Suite 400" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>CITY *</label>
                <input style={inputStyle} value={form.city} onChange={e => setField("city", e.target.value)} placeholder="Chicago" />
              </div>
              <div>
                <label style={labelStyle}>STATE / PROVINCE</label>
                <input style={inputStyle} value={form.province} onChange={e => setField("province", e.target.value)} placeholder="IL" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>ZIP / POSTAL *</label>
                <input style={inputStyle} value={form.zip} onChange={e => setField("zip", e.target.value)} placeholder="60601" />
              </div>
              <div>
                <label style={labelStyle}>COUNTRY</label>
                <input style={inputStyle} value={form.country} onChange={e => setField("country", e.target.value)} placeholder="US" />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>PHONE</label>
              <input style={inputStyle} value={form.phone} onChange={e => setField("phone", e.target.value)} placeholder="+1 312-555-0100" />
            </div>

            {error && <p style={{ color: "var(--danger)", fontSize: 12, marginBottom: 12 }}>{error}</p>}

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving} style={{ flex: 1 }}>
                {saving ? "Saving…" : "Save address"}
              </button>
              <button className="btn btn-ghost" onClick={() => { setShowAdd(false); setError(""); }} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
